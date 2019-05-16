const { keyAndStructParser, types, fourCCs } = require('./keys');
const parseV = require('./parseV');

//is it better to slice the data when recursing? Or just pass indices? we have to slice anyway when parsing
function parseKLV(data, options = {}, start = 0, end = data.length) {
  const root = start === 0;
  let result = {};
  //Will store unknown types
  let unknown = new Set();
  //Will store complex type definitions
  let complexType = [];
  //Track if we are repeating keys, to organise arrays correctly
  let lastCC = { key: null, times: 0 };
  while (start < end) {
    let length;

    try {
      //Parse the first 2 sections (64 bits) of each KLV to decide what to do with the third
      const ks = keyAndStructParser.parse(data.slice(start)).result;

      //Get the length of the value (or values, or nested values)
      length = ks.size * ks.repeat;
      let partialResult = [];

      if (length >= 0) {
        //If empty, we still want to store the fourCC
        if (length === 0) partialResult.push(null);
        //Log unknown types for future implementation
        else if (!types[ks.type]) unknown.add(ks.type);
        //Recursive call to parse nested data
        else if (types[ks.type].nested) partialResult.push(parseKLV(data, options, start + 8, start + 8 + length));
        //We can parse the Value
        else if (types[ks.type].func || (types[ks.type].complex && complexType)) {
          //Detect data with multiple axes
          let axes = 1;
          if (types[ks.type].size > 1) axes = ks.size / types[ks.type].size;
          //Detect them when the type is complex
          else if (types[ks.type].complex && complexType.length) axes = complexType.length;
          //Human readable strings should de merged for readability
          if (fourCCs[ks.fourCC] && fourCCs[ks.fourCC].merge) {
            ks.size = length;
            ks.repeat = 1;
          }

          const environment = { data, options, ks };
          const specifics = { ax: axes, complexType };

          //Access the values or single value
          if (ks.repeat > 1) {
            for (let i = 0; i < ks.repeat; i++) partialResult.push(parseV(environment, start + 8 + i * ks.size, ks.size, specifics));
          } else partialResult.push(parseV(environment, start + 8, length, specifics));
          //If we just read a TYPE value, store it. Will be necessary in this nest
          if (ks.fourCC === 'TYPE') complexType = partialResult[partialResult.lenght - 1];

          //Something went wrong, store type for debugging
        } else unknown.add(ks.type);

        //Count times we are saving to the same fourCC key, to avoid overwriting or nesting arrays
        if (lastCC.key === ks.fourCC) lastCC.times++;
        else lastCC = { key: ks.fourCC, times: 0 };

        //Identify keys or results meant to be array
        const shouldArray = key => fourCCs[key] && fourCCs[key].array;

        // //First occurence of the fourCC
        // if (lastCC.times === 0) {
        //   if (shouldArray(ks.fourCC)) result[ks.fourCC] = [partialResult];
        //   else result[ks.fourCC] = partialResult;
        //   //First repetition. Create array if not done. Then always push
        //   // } else if (lastCC.times === 1) {
        //   //   if (shouldArray(ks.fourCC)) result[ks.fourCC].push(partialResult);
        //   //   else result[ks.fourCC] = [result[ks.fourCC], partialResult];
        // } else result[ks.fourCC].push(partialResult);
        if (result[ks.fourCC]) result[ks.fourCC] = result[ks.fourCC].concat(partialResult);
        else result[ks.fourCC] = partialResult;

        //Parsing error
      } else throw new Error('Error, negative length');
    } catch (err) {
      setImmediate(() => console.error(err));
    }

    //Advance to the next KLV, at least 64 bits
    const reached = start + 8 + (length >= 0 ? length : 0);
    //Align to 32 bits
    while (start < reached) start += 4;
  }

  for (const key in result) if (key !== lastCC.key && result[key].length === 1) result[key] = result[key][0];

  //If debugging, print unexpected types
  if (options.debug && unknown.size) setImmediate(() => console.log('unknown types:', [...unknown].join(',')));
  if (root && !result.DEVC) {
    const err = 'Invalid GPMF data. Root object must contain DEVC key';
    if (options.tolerant) setImmediate(() => console.error(err));
    else throw new Error(`${err}. Use the 'tolerant' option to return anyway`);
  }

  // console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');

  // console.log(lastCC.key, result[lastCC.key]);

  //Clean up after applying types
  if (result.hasOwnProperty('TYPE')) delete result.TYPE;

  return result;
}

module.exports = parseKLV;

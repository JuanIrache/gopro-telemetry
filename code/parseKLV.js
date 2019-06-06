const { keyAndStructParser, types, mergeStrings } = require('./keys');
const parseV = require('./parseV');

//is it better to slice the data when recursing? Or just pass indices? we have to slice anyway when parsing
function parseKLV(data, options = {}, start = 0, end = data.length, parent) {
  let result = {};
  //Will store unknown types
  let unknown = new Set();
  //Will store complex type definitions
  let complexType = [];
  //Track if we are repeating keys, to organise arrays correctly
  let lastCC;
  while (start < end) {
    let length;
    let reached;
    let tempStart;
    try {
      //Parse the first 2 sections (64 bits) of each KLV to decide what to do with the third
      const ks = keyAndStructParser.parse(data.slice(start)).result;

      //Get the length of the value (or values, or nested values)
      length = ks.size * ks.repeat;

      //Advance to the next KLV, at least 64 bits
      reached = start + 8 + (length >= 0 ? length : 0);
      tempStart = start;
      //Align to 32 bits
      while (tempStart < reached) tempStart += 4;
      //Find if this is the last CC of the nest and emember it to keep it as array
      if (tempStart >= end) lastCC = ks.fourCC;

      let partialResult = [];
      //Check if the lastCC is to be filtered out by options
      if (lastCC && parent === 'STRM' && options.stream && !options.stream.includes(ks.fourCC)) return null;
      else if (length >= 0) {
        //Remember last key for interpreting data later
        if (lastCC) result.interpretSamples = ks.fourCC;

        //If empty, we still want to store the fourCC
        if (length === 0) partialResult.push(null);
        //Log unknown types for future implementation
        else if (!types[ks.type]) unknown.add(ks.type);
        //Recursive call to parse nested data
        else if (types[ks.type].nested) {
          const parsed = parseKLV(data, options, start + 8, start + 8 + length, ks.fourCC);
          if (parsed != null) partialResult.push(parsed);
        }
        //We can parse the Value
        else if (types[ks.type].func || (types[ks.type].complex && complexType)) {
          //Detect data with multiple axes
          let axes = 1;
          if (types[ks.type].size > 1) axes = ks.size / types[ks.type].size;
          //Detect them when the type is complex
          else if (types[ks.type].complex && complexType.length) axes = complexType.length;
          //Human readable strings should de merged for readability
          if (mergeStrings.includes(ks.fourCC)) {
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
          if (ks.fourCC === 'TYPE') complexType = partialResult[0];

          //Something went wrong, store type for debugging
        } else unknown.add(ks.type);

        if (result.hasOwnProperty(ks.fourCC)) {
          result[ks.fourCC] = result[ks.fourCC].concat(partialResult);
        } else result[ks.fourCC] = partialResult;

        //Parsing error
      } else throw new Error('Error, negative length');
    } catch (err) {
      setImmediate(() => console.error(err));
    }

    //If crashed reached is null, advance to the next KLV, at least 64 bits
    if (reached == null) {
      reached = start + 8 + (length >= 0 ? length : 0);
      //Align to 32 bits
      while (start < reached) start += 4;
    } else start = tempStart;
  }

  //Undo all arrays except the last key, which should be the array of samples
  for (const key in result) if (key !== lastCC && result[key].length === 1) result[key] = result[key][0];

  //If debugging, print unexpected types
  if (options.debug && unknown.size) setImmediate(() => console.log('unknown types:', [...unknown].join(',')));

  return result;
}

module.exports = parseKLV;

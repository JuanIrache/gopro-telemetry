//binary-parser does not support 64bits use @gmod/binary-parser
const Parser = require('@gmod/binary-parser').Parser;
// const Parser64 = require('@gmod/binary-parser').Parser;
const { keyAndStructParser, types, fourCCs } = require('./keys');

//is it better to slice the data when recursing? Or just pass indices? we have to slice anyway when parsing
function parse(data, options = {}, start = 0, end = data.length) {
  let result = {};
  //Will store unknown types
  let unknown = new Set();
  //Will store complex type definitions
  let complexType;

  while (start < end) {
    let length;

    try {
      //Parse the first 2 sections (64 bits) of each KLV to decide what to do with the third
      const ks = keyAndStructParser.parse(data.slice(start)).result;

      //Get the length of the value (or values, or nested values)
      length = ks.size * ks.repeat;
      let partialResult;

      if (length >= 0) {
        //If empty, we still want to store the fourCC
        if (length === 0) partialResult = null;
        //Log unknown types for future implementation
        else if (!types[ks.type]) unknown.add(ks.type);
        //Recursive call to parse nested data
        else if (types[ks.type].nested) partialResult = parse(data, options, start + 8, start + 8 + length);
        //We can parse the Value
        else if (types[ks.type].func || (types[ks.type].complex && complexType)) {
          //Detect data with multiple axes
          let axes = 1;
          if (types[ks.type].size > 1) axes = ks.size / types[ks.type].size;
          //Detect them when the type is complex
          else if (types[ks.type].complex && complexType && complexType.length) axes = complexType.length;

          //Human readable strings should de merged for readability
          if (fourCCs[ks.fourCC] && fourCCs[ks.fourCC].merge) {
            ks.size = length;
            ks.repeat = 1;
          }

          //Main data accessing function
          //Refactor for performance/memory?
          const getPartial = function(slice, len, ax = 1, type = ks.type) {
            //Log unknown types for future implementation
            if (!types[type]) unknown.add(type);
            else {
              //Split data when axes present
              if (ax > 1) {
                //Will return array of values
                let res = [];

                for (let i = 0; i < ax; i++) {
                  let innerType = type;
                  //Pick type from previously read data if needed
                  if (types[type].complex) innerType = complexType[i];
                  res.push(getPartial(slice + (i * ks.size) / ax, len / ax, 1, innerType));
                }
                return res;

                //Otherwise, read a single value
              } else if (!types[type].complex) {
                //Add options required by type
                let opts = { length: len };
                if (types[type].opt) for (const key in types[type].opt) opts[key] = types[type].opt[key];
                //We pick the necessary function based on data format (stored in types)
                let valParser = new Parser().endianess('big')[types[type].func]('value', opts);
                const parsed = valParser.parse(data.slice(slice)).result;
                return parsed.value;

                //Data is complex but did not find axes
              } else throw new Error('Complex type ? with only one axis');
            }
          };

          //Access the values or single value
          if (ks.repeat > 1) {
            partialResult = [];
            for (let i = 0; i < ks.repeat; i++) partialResult.push(getPartial(start + 8 + i * ks.size, ks.size, axes));
          } else partialResult = getPartial(start + 8, length, axes);

          //If we just read a TYPE value, store it. Will be necessary in this nest
          if (ks.fourCC === 'TYPE') complexType = partialResult;

          //Something went wrong, store type for debugging
        } else unknown.add(ks.type);

        //Save value un result or add to results array
        if (result[ks.fourCC] == null) result[ks.fourCC] = partialResult;
        else if (Array.isArray(result[ks.fourCC])) result[ks.fourCC].push(partialResult);
        else result[ks.fourCC] = [result[ks.fourCC], partialResult];

        //Something is wrong
      } else throw new Error('Error, negative length');
    } catch (err) {
      setImmediate(() => console.error(err));
    }

    //Advance to the next KLV, at least 64 bits
    const reached = start + 8 + (length >= 0 ? length : 0);
    //Align to 32 bits
    while (start < reached) start += 4;
  }

  //If debugging, print unexpected types
  if (options.debug && unknown.size) setImmediate(() => console.log('unknown types:', [...unknown].join(',')));

  return result;
}

module.exports = parse;

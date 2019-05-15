//Main data accessing function. Reads the V in KLV

//binary-parser does not support 64bits use @gmod/binary-parser
const Parser = require('@gmod/binary-parser').Parser;
const { types } = require('./keys');
//Will store unknown types
let unknown = new Set();

//Refactor for performance/memory?
function parseV(environment, slice, len, specifics) {
  const { data, options, ks } = environment;
  const { ax = 1, type = ks.type, complexType } = specifics;

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
        res.push(parseV(environment, slice + (i * ks.size) / ax, len / ax, { ax: 1, type: innerType, complexType }));
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

  //If debugging, print unexpected types
  if (options.debug && unknown.size) setImmediate(() => console.log('unknown types:', [...unknown].join(',')));
}

module.exports = parseV;

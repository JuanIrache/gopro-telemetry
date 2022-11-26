//Main data accessing function. Reads the V in KLV

//Binary-parser does not support 64bits. Use @gmod/binary-parser
const Parser = require('@gmod/binary-parser').Parser;
const { types } = require('./data/keys');
//Will store unknown types
let unknown = new Set();

const valueParsers = {};

function getValueParserForType(type, opts) {
  const key = `${type}-${JSON.stringify(opts)}`;
  if (!valueParsers.hasOwnProperty(key)) {
    valueParsers[key] = new Parser()
      .endianess('big')
      [types[type].func]('value', opts);
  }
  return valueParsers[key];
}

//Refactor for performance/memory?
function parseV(environment, slice, len, specifics) {
  const { data, options, ks } = environment;
  const { ax = 1, type = ks.type, complexType } = specifics;

  //Split data when axes present
  if (ax > 1) {
    //Will return array of values
    let res = [];

    let sliceProgress = 0;
    for (let i = 0; i < ax; i++) {
      let innerType = type;
      //Pick type from previously read data if needed
      if (types[type].complex) innerType = complexType[i];
      //Log unknown types for future implementation
      if (!types[innerType]) {
        unknown.add(type);
        res.push(null);
      } else {
        const from = slice + sliceProgress;
        const axLen =
          types[innerType].size ||
          (types[innerType].opt || {}).length ||
          len / ax;
        sliceProgress += axLen;
        res.push(
          parseV(environment, from, axLen, {
            ax: 1,
            type: innerType,
            complexType
          })
        );
      }
    }

    //If debugging, print unexpected types
    if (options.debug && unknown.size)
      setImmediate(() =>
        console.warn('unknown types:', [...unknown].join(','))
      );
    return res;

    //Otherwise, read a single value
  } else if (!types[type].complex) {
    //Add options required by type
    let opts = { length: len };
    if (types[type].opt)
      for (const key in types[type].opt) opts[key] = types[type].opt[key];
    //We pick the necessary function based on data format (stored in types)
    let valParser = getValueParserForType(type, opts);
    const parsed = valParser.parse(data.slice(slice)).result;

    return parsed.value;

    //Data is complex but did not find axes
  } else throw new Error('Complex type ? with only one axis');
}

module.exports = parseV;

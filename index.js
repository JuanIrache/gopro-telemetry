const Parser = require('binary-parser').Parser;
const { keyAndStructParser, types, fourCCs } = require('./keys');

//is it better to slice the data when recursing? Or just pass indices? we have to slice anyway when parsing
function parse(data, start = 0, end = data.length) {
  let result = {};
  let unknown = new Set();
  let complexType;
  while (start < end) {
    let length;
    try {
      const ks = keyAndStructParser.parse(data.slice(start));
      length = ks.size * ks.repeat;
      let partialResult;
      if (length >= 0) {
        //If empty, we still want to show the fourCC
        if (length === 0) partialResult = null;
        //Record unknown types for future use
        else if (!types[ks.type]) unknown.add(ks.type);
        else if (types[ks.type].nested) partialResult = parse(data, start + 8, start + 8 + length);
        else if (types[ks.type].func || (types[ks.type].complex && complexType)) {
          let opts = {};
          if (types[ks.type].opt) {
            for (const key in types[ks.type].opt) opts[key] = types[ks.type].opt[key];
          }

          let axes = 1;
          if (types[ks.type].size > 1) axes = ks.size / types[ks.type].size;
          else if (types[ks.type].complex) {
            if (complexType && complexType.length) {
              axes = complexType.length;
            }
          }

          if (fourCCs[ks.fourCC] && fourCCs[ks.fourCC].merge) {
            ks.size = length;
            ks.repeat = 1;
          }

          //refactor for performance/memory?
          const getPartial = function(slice, op, ax = 1, type = ks.type) {
            if (!types[type]) unknown.add(type);
            else {
              if (ax > 1) {
                let res = [];
                for (let i = 0; i < ax; i++) {
                  let innerType = type;
                  if (types[type].complex) {
                    innerType = complexType[i];
                  }
                  res.push(getPartial(slice + (i * ks.size) / ax, op, 1, innerType));
                }
                return res;
              } else if (!types[type].complex) {
                const valParser = new Parser().endianess('big')[types[type].func]('value', op);
                const str = valParser.parse(data.slice(slice));
                return str.value;
              } else {
                throw new Error('Complex type ? with just one axis');
              }
            }
          };

          if (ks.repeat > 1) {
            opts.length = ks.size;
            partialResult = [];
            for (let i = 0; i < ks.repeat; i++) {
              partialResult.push(getPartial(start + 8 + i * ks.size, opts, axes));
            }
          } else {
            opts.length = length;
            partialResult = getPartial(start + 8, opts, axes);
          }
          if (ks.fourCC === 'TYPE') complexType = partialResult;
        } else unknown.add(ks.type);
        if (result[ks.fourCC] == null) result[ks.fourCC] = partialResult;
        else if (Array.isArray(result[ks.fourCC])) result[ks.fourCC].push(partialResult);
        else result[ks.fourCC] = [result[ks.fourCC], partialResult];
      } else {
        console.error('Error, negative length', ks);
        return result;
      }
    } catch (err) {
      console.error(err);
      return result;
    }
    const reached = start + 8 + (length >= 0 ? length : 0);
    while (start < reached) start += 4;
  }
  // if (unknown.size) console.log('unknown:', [...unknown]);

  return result;
}

module.exports = parse;

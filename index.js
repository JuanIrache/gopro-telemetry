const parseKLV = require('./code/parseKLV');
const interpretKLV = require('./code/interpretKLV');

module.exports = function(input, options = {}) {
  let result = parseKLV(input.rawData, options);
  if (!options.raw) result = interpretKLV(result, options);
  return result;
};

const parseKLV = require('./code/parseKLV');
const timeKLV = require('./code/timeKLV');
const interpretKLV = require('./code/interpretKLV');

module.exports = function(input, options = {}) {
  let result = parseKLV(input.rawData, options);
  if (!options.raw) {
    result = interpretKLV(result, input.timing, options);
    result = timeKLV(result, input.timing, options);
  }
  return result;
};

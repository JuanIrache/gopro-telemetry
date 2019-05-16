const parseKLV = require('./code/parseKLV');
const interpretKLV = require('./code/interpretKLV');

module.exports = function(data, options = {}) {
  let result = parseKLV(data, options);
  if (!options.raw) result = interpretKLV(result, options);
  return result;
};

const parseKLV = require('./code/parseKLV');
const groupDevices = require('./code/groupDevices');
const timeKLV = require('./code/timeKLV');
const interpretKLV = require('./code/interpretKLV');

module.exports = function(input, options = {}) {
  const parsed = parseKLV(input.rawData, options);
  if (!options.raw) {
    let result = {};
    const interpreted = interpretKLV(parsed, options);
    const grouped = groupDevices(interpreted, options);
    for (const key in grouped) result[key] = timeKLV(grouped[key], input.timing, options);
    return result;
  }
  return parsed;
};

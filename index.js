const parseKLV = require('./code/parseKLV');
const groupDevices = require('./code/groupDevices');
const timeKLV = require('./code/timeKLV');
const interpretKLV = require('./code/interpretKLV');

module.exports = function(input, options = {}) {
  const parsed = parseKLV(input.rawData, options);
  const grouped = groupDevices(parsed, options);
  if (options.deviceList) {
    let devices = {};
    for (const key in grouped) if (grouped[key].DEVC.length) devices[key] = grouped[key].DEVC[0].DVNM;
    return devices;
  }
  if (options.raw) return grouped;
  let interpreted = {};
  for (const key in grouped) interpreted[key] = interpretKLV(grouped[key], options);
  let timed = {};
  for (const key in grouped) timed[key] = timeKLV(interpreted[key], input.timing, options);
  return timed;
};

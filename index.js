const parseKLV = require('./code/parseKLV');
const groupDevices = require('./code/groupDevices');
const deviceList = require('./code/deviceList');
const timeKLV = require('./code/timeKLV');
const interpretKLV = require('./code/interpretKLV');
const mergeSensor = require('./code/mergeSensor');

module.exports = function(input, options = {}) {
  //Parse input
  const parsed = parseKLV(input.rawData, options);
  //Return list of devices only
  if (options.deviceList) return deviceList(parsed);
  //Return now if raw wanted
  if (options.raw) return parsed;
  //Group it by device
  const grouped = groupDevices(parsed, options);
  let interpreted = {};
  //Apply scale and matrix transformations
  for (const key in grouped) interpreted[key] = interpretKLV(grouped[key], options);
  let timed = {};
  //Apply timing (gps and mp4) to every sample
  for (const key in interpreted) timed[key] = timeKLV(interpreted[key], input.timing, options);
  let merged = {};
  //Merge samples in sensor entries
  for (const key in timed) merged[key] = mergeSensor(timed[key], options);
  return merged;
};

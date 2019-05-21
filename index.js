const parseKLV = require('./code/parseKLV');
const groupDevices = require('./code/groupDevices');
const deviceList = require('./code/deviceList');
const streamList = require('./code/streamList');
const timeKLV = require('./code/timeKLV');
const interpretKLV = require('./code/interpretKLV');
const mergeStream = require('./code/mergeStream');

module.exports = function(input, options = {}) {
  //Create filter arrays if user didn't
  if (options.device && !Array.isArray(options.device)) options.device = [options.device];
  if (options.stream && !Array.isArray(options.stream)) options.stream = [options.stream];
  //Read framerate to convert groupTimes to number if needed
  if (options.groupTimes === 'frames') options.groupTimes = input.timing.frameDuration;
  //Parse input
  const parsed = parseKLV(input.rawData, options);
  if (!parsed.DEVC) {
    setImmediate(() => console.error('Invalid GPMF data. Root object must contain DEVC key'));
    if (options.tolerant) return parsed;
    else return undefined;
  }
  //Return list of devices/streams only
  if (options.deviceList) return deviceList(parsed);
  if (options.streamList) return streamList(parsed);
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
  for (const key in timed) merged[key] = mergeStream(timed[key], options);
  return merged;
};

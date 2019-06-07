const parseKLV = require('./code/parseKLV');
const groupDevices = require('./code/groupDevices');
const deviceList = require('./code/deviceList');
const streamList = require('./code/streamList');
const timeKLV = require('./code/timeKLV');
const interpretKLV = require('./code/interpretKLV');
const mergeStream = require('./code/mergeStream');
const groupTimes = require('./code/groupTimes');
const smoothSamples = require('./code/smoothSamples');
const processGPS5 = require('./code/processGPS5');

function process(input, options) {
  //Create filter arrays if user didn't
  if (options.device && !Array.isArray(options.device)) options.device = [options.device];
  if (options.stream && !Array.isArray(options.stream)) options.stream = [options.stream];

  //Parse input
  const parsed = parseKLV(input.rawData, options);
  if (!parsed.DEVC) {
    const error = new Error('Invalid GPMF data. Root object must contain DEVC key');
    if (options.tolerant) {
      setImmediate(() => console.error(error));
      return parsed;
    } else throw error;
  }

  //Return list of devices/streams only
  if (options.deviceList) return deviceList(parsed);

  if (options.streamList) return streamList(parsed);

  //Return now if raw wanted
  if (options.raw) return parsed;
  //Group it by device
  const grouped = groupDevices(parsed);

  //Correct GPS height and filter out bad GPS data
  if (!options.ellipsoid || options.GPS5Precision != null || options.GPS5Fix != null) {
    for (const key in grouped) grouped[key] = processGPS5(grouped[key], options);
  }

  let interpreted = {};
  //Apply scale and matrix transformations
  for (const key in grouped) interpreted[key] = interpretKLV(grouped[key], options);

  let timed = {};
  //Apply timing (gps and mp4) to every sample
  for (const key in interpreted) timed[key] = timeKLV(interpreted[key], input.timing, options);

  //Merge samples in sensor entries
  let merged = {};
  for (const key in timed) merged[key] = mergeStream(timed[key], options);

  //Read framerate to convert groupTimes to number if needed
  if (options.groupTimes === 'frames') options.groupTimes = input.timing.frameDuration;
  //Group samples by time if necessary
  if (options.groupTimes) merged = groupTimes(merged, options);

  //Group samples by time if necessary
  if (options.smooth) merged = smoothSamples(merged, options);

  //Add framerate to top level
  if (input.timing && input.timing.frameDuration != null) merged['frames/second'] = 1 / input.timing.frameDuration;

  return merged;
}

module.exports = function(input, options = {}) {
  if (options.promisify) {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        try {
          resolve(process(input, options));
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  return process(input, options);
};

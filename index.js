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
  let timing = { prev: Date.now(), start: Date.now(), parts: {} };
  //Create filter arrays if user didn't
  if (options.device && !Array.isArray(options.device)) options.device = [options.device];
  if (options.stream && !Array.isArray(options.stream)) options.stream = [options.stream];

  //Parse input
  const parsed = parseKLV(input.rawData, options);
  timing.parts.parseKLV = Date.now() - timing.prev;
  timing.prev = Date.now();
  if (!parsed.DEVC) {
    setImmediate(() => console.error('Invalid GPMF data. Root object must contain DEVC key'));
    if (options.tolerant) return parsed;
    //ToDo crash if not tolerant?
    else return undefined;
  }

  //Return list of devices/streams only
  if (options.deviceList) return deviceList(parsed);
  timing.parts.deviceList = Date.now() - timing.prev;
  timing.prev = Date.now();

  if (options.streamList) return streamList(parsed);
  timing.parts.streamList = Date.now() - timing.prev;
  timing.prev = Date.now();

  //Return now if raw wanted
  if (options.raw) return parsed;
  //Group it by device
  const grouped = groupDevices(parsed, options);
  timing.parts.groupDevices = Date.now() - timing.prev;
  timing.prev = Date.now();

  //Correct GPS height and filter out bad GPS data
  if (!options.ellipsoid || options.GPS5Precision != null || options.GPS5Fix != null)
    for (const key in grouped) grouped[key] = processGPS5(grouped[key], options);
  timing.parts.processGPS5 = Date.now() - timing.prev;
  timing.prev = Date.now();

  let interpreted = {};
  //Apply scale and matrix transformations
  for (const key in grouped) interpreted[key] = interpretKLV(grouped[key], options);
  timing.parts.interpretKLV = Date.now() - timing.prev;
  timing.prev = Date.now();

  let timed = {};
  //Apply timing (gps and mp4) to every sample
  for (const key in interpreted) timed[key] = timeKLV(interpreted[key], input.timing, options);
  timing.parts.timeKLV = Date.now() - timing.prev;
  timing.prev = Date.now();

  //Merge samples in sensor entries
  let merged = {};
  for (const key in timed) merged[key] = mergeStream(timed[key], options);
  timing.parts.mergeStream = Date.now() - timing.prev;
  timing.prev = Date.now();

  //Read framerate to convert groupTimes to number if needed
  if (options.groupTimes === 'frames') options.groupTimes = input.timing.frameDuration;
  //Group samples by time if necessary
  if (options.groupTimes) merged = groupTimes(merged, options);
  timing.parts.groupTimes = Date.now() - timing.prev;
  timing.prev = Date.now();

  //Group samples by time if necessary
  if (options.smooth) merged = smoothSamples(merged, options);
  timing.parts.smoothSamples = Date.now() - timing.prev;
  timing.prev = Date.now();

  //Add framerate to top level
  if (input.timing && input.timing.frameDuration != null) merged['frames/second'] = 1 / input.timing.frameDuration;
  const totalTime = Date.now() - timing.start;
  console.log('total', totalTime);
  for (const key in timing.parts) {
    const partTime = timing.parts[key];
    console.log(key, partTime, (100 * partTime) / totalTime + '%');
  }

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

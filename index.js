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
const presetsOpts = require('./code/presetsOptions');
const toGpx = require('./code/toGpx');
const toKml = require('./code/toKml');
const toGeojson = require('./code/toGeojson');
const toCsv = require('./code/toCsv');
const toAecsv = require('./code/toAecsv');

function process(input, opts) {
  //Prepare presets
  if (presetsOpts[opts.preset]) {
    opts = { ...opts, ...presetsOpts.general.mandatory, ...presetsOpts[opts.preset].mandatory };
    //Only pick the non mandatory options when the user did not specify them
    for (const key in presetsOpts.general.preferred) if (opts[key] == null) opts[key] = presetsOpts.general.preferred[key];
    for (const key in presetsOpts[opts.preset].preferred) if (opts[key] == null) opts[key] = presetsOpts[opts.preset].preferred[key];
  }

  //Create filter arrays if user didn't
  if (opts.device && !Array.isArray(opts.device)) opts.device = [opts.device];
  if (opts.stream && !Array.isArray(opts.stream)) opts.stream = [opts.stream];

  //Parse input
  const parsed = parseKLV(input.rawData, opts);
  if (!parsed.DEVC) {
    const error = new Error('Invalid GPMF data. Root object must contain DEVC key');
    if (opts.tolerant) {
      setImmediate(() => console.error(error));
      return parsed;
    } else throw error;
  }

  //Return list of devices/streams only
  if (opts.deviceList) return deviceList(parsed);

  if (opts.streamList) return streamList(parsed);

  //Return now if raw wanted
  if (opts.raw) return parsed;
  //Group it by device
  const grouped = groupDevices(parsed);

  //Correct GPS height and filter out bad GPS data
  if (!opts.ellipsoid || opts.geoidHeight || opts.GPS5Precision != null || opts.GPS5Fix != null) {
    for (const key in grouped) grouped[key] = processGPS5(grouped[key], opts);
  }

  let interpreted = {};
  //Apply scale and matrix transformations
  for (const key in grouped) interpreted[key] = interpretKLV(grouped[key], opts);

  let timed = {};
  //Apply timing (gps and mp4) to every sample
  for (const key in interpreted) timed[key] = timeKLV(interpreted[key], input.timing, opts);

  //Merge samples in sensor entries
  let merged = {};
  for (const key in timed) merged[key] = mergeStream(timed[key], opts);

  //Read framerate to convert groupTimes to number if needed
  if (opts.groupTimes === 'frames') opts.groupTimes = 1 / input.timing.frameDuration;
  //Group samples by time if necessary
  if (opts.groupTimes) merged = groupTimes(merged, opts);

  //Group samples by time if necessary
  if (opts.smooth) merged = smoothSamples(merged, opts);

  //Add framerate to top level
  if (input.timing && input.timing.frameDuration != null) merged['frames/second'] = 1 / input.timing.frameDuration;

  //Process presets
  if (opts.preset === 'gpx') return toGpx(merged, opts);
  if (opts.preset === 'kml') return toKml(merged, opts);
  if (opts.preset === 'geojson') return toGeojson(merged, opts);
  if (opts.preset === 'csv') return toCsv(merged);
  if (opts.preset === 'aecsv') return toAecsv(merged);

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

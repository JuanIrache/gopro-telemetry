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
const toMgjson = require('./code/toMgjson');
const mergeInterpretedSources = require('./code/mergeInterpretedSources');
const setSourceOffset = require('./code/setSourceOffset');

function parseOne({ rawData }, opts) {
  //Parse input
  const parsed = parseKLV(rawData, opts);
  if (!parsed.DEVC) {
    const error = new Error('Invalid GPMF data. Root object must contain DEVC key');
    if (opts.tolerant) {
      setImmediate(() => console.error(error));
      return parsed;
    } else throw error;
  }

  return parsed;
}

function interpretOne(timing, parsed, opts) {
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
  for (const key in interpreted) timed[key] = timeKLV(interpreted[key], timing, opts);

  //Merge samples in sensor entries
  let merged = {};
  for (const key in timed) merged[key] = mergeStream(timed[key], opts);

  return merged;
}

function process(input, opts) {
  //Prepare presets
  if (presetsOpts[opts.preset]) {
    opts = { ...opts, ...presetsOpts.general.mandatory, ...presetsOpts[opts.preset].mandatory };
    //Only pick the non mandatory options when the user did not specify them
    for (const key in presetsOpts.general.preferred)
      if (opts[key] == null) opts[key] = presetsOpts.general.preferred[key];
    for (const key in presetsOpts[opts.preset].preferred)
      if (opts[key] == null) opts[key] = presetsOpts[opts.preset].preferred[key];
  }

  //Create filter arrays if user didn't
  if (opts.device && !Array.isArray(opts.device)) opts.device = [opts.device];
  if (opts.stream && !Array.isArray(opts.stream)) opts.stream = [opts.stream];

  let interpreted;
  let timing;

  //Check if input is array of sources
  if (Array.isArray(input) && input.length === 1) input = input[0];
  if (!Array.isArray(input)) {
    timing = JSON.parse(JSON.stringify(input.timing));
    timing.start = new Date(timing.start);
    const parsed = parseOne(input, opts);

    //Return list of devices/streams only
    if (opts.deviceList) return deviceList(parsed);
    if (opts.streamList) return streamList(parsed);

    //Return now if raw wanted
    if (opts.raw) return parsed;

    interpreted = interpretOne(timing, parsed, opts);
  } else {
    let timing = input.map(i => JSON.parse(JSON.stringify(i.timing)));
    timing = timing.map(t => ({ ...t, start: new Date(t.start) }));
    //Sort by in time
    const sortedInput = input
      .concat()
      .sort((a, b) => a.timing.start.getTime() - b.timing.start.getTime());

    //Loop parse all files, with offsets
    const parsed = [];
    for (let i = 0; i < sortedInput.length; i++) {
      if (i > 0) setSourceOffset(timing[i - 1], timing[i]);
      parsed.push(parseOne(sortedInput[i], opts));
    }

    //Return list of devices/streams only
    if (opts.deviceList) return parsed.map(p => deviceList(p));
    if (opts.streamList) return parsed.map(p => streamList(p));

    //Return now if raw wanted
    if (opts.raw) return parsed;

    //Interpret all
    const interpretedArr = parsed.map((p, i) => interpretOne(timing[i], p, opts));

    //Merge samples in interpreted obj
    interpreted = mergeInterpretedSources(interpretedArr);

    //Set single timing for rest of outer function
    timing = timing[0];
  }

  //Read framerate to convert groupTimes to number if needed
  if (opts.groupTimes === 'frames') {
    if (timing && timing.frameDuration) opts.groupTimes = timing.frameDuration * 1000;
    else throw new Error('Frame rate is needed for your current options');
  }

  //Group samples by time if necessary
  if (opts.groupTimes) interpreted = groupTimes(interpreted, opts);

  //Group samples by time if necessary
  if (opts.smooth) interpreted = smoothSamples(interpreted, opts);

  //Add framerate to top level
  if (timing && timing.frameDuration != null)
    interpreted['frames/second'] = 1 / timing.frameDuration;

  //Process presets
  if (opts.preset === 'gpx') return toGpx(interpreted, opts);
  if (opts.preset === 'kml') return toKml(interpreted, opts);
  if (opts.preset === 'geojson') return toGeojson(interpreted, opts);
  if (opts.preset === 'csv') return toCsv(interpreted);
  if (opts.preset === 'mgjson') return toMgjson(interpreted, opts);

  return interpreted;
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

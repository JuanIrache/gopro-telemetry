const parseKLV = require('./code/parseKLV');
const groupDevices = require('./code/groupDevices');
const deviceList = require('./code/deviceList');
const streamList = require('./code/streamList');
const keys = require('./code/keys');
const timeKLV = require('./code/timeKLV');
const interpretKLV = require('./code/interpretKLV');
const mergeStream = require('./code/mergeStream');
const groupTimes = require('./code/groupTimes');
const smoothSamples = require('./code/smoothSamples');
const processGPS5 = require('./code/processGPS5');
const presetsOpts = require('./code/presetsOptions');
const toGpx = require('./code/toGpx');
const toVirb = require('./code/toVirb');
const toKml = require('./code/toKml');
const toGeojson = require('./code/toGeojson');
const toCsv = require('./code/toCsv');
const toMgjson = require('./code/toMgjson');
const mergeInterpretedSources = require('./code/mergeInterpretedSources');
const setSourceOffset = require('./code/setSourceOffset');

async function parseOne({ rawData, parsedData }, opts) {
  if (parsedData) return parsedData;

  //Parse input
  const parsed = await parseKLV(rawData, opts);
  if (!parsed.DEVC) {
    const error = new Error(
      'Invalid GPMF data. Root object must contain DEVC key'
    );
    if (opts.tolerant) {
      setImmediate(() => console.error(error));
      return parsed;
    } else throw error;
  }

  return parsed;
}

async function interpretOne(timing, parsed, opts, toMerge) {
  //Group it by device
  const grouped = await groupDevices(parsed);

  //Correct GPS height and filter out bad GPS data
  if (
    !opts.ellipsoid ||
    opts.geoidHeight ||
    opts.GPS5Precision != null ||
    opts.GPS5Fix != null
  ) {
    for (const key in grouped)
      grouped[key] = await processGPS5(grouped[key], opts);
  }

  let interpreted = {};
  //Apply scale and matrix transformations
  for (const key in grouped)
    interpreted[key] = await interpretKLV(grouped[key], opts);

  let timed = {};
  //Apply timing (gps and mp4) to every sample
  for (const key in interpreted) {
    timed[key] = await timeKLV(interpreted[key], timing, opts, toMerge);
  }

  //Merge samples in sensor entries
  let merged = {};
  for (const key in timed) merged[key] = await mergeStream(timed[key], opts);

  return merged;
}

function progress(options, amount) {
  if (options.progress) options.progress(amount);
}

async function process(input, opts) {
  //Prepare presets
  if (presetsOpts[opts.preset]) {
    opts = {
      ...opts,
      ...presetsOpts.general.mandatory,
      ...presetsOpts[opts.preset].mandatory
    };
    //Only pick the non mandatory options when the user did not specify them
    for (const key in presetsOpts.general.preferred)
      if (opts[key] == null) opts[key] = presetsOpts.general.preferred[key];
    for (const key in presetsOpts[opts.preset].preferred)
      if (opts[key] == null)
        opts[key] = presetsOpts[opts.preset].preferred[key];
  }

  //Create filter arrays if user didn't
  if (opts.device && !Array.isArray(opts.device)) opts.device = [opts.device];
  if (opts.stream && !Array.isArray(opts.stream)) opts.stream = [opts.stream];

  let interpreted;
  let timing;

  // Provide approximate progress updates
  progress(opts, 0.01);

  //Check if input is array of sources
  if (Array.isArray(input) && input.length === 1) input = input[0];
  if (!Array.isArray(input)) {
    if (input.timing) {
      timing = JSON.parse(JSON.stringify(input.timing));
      timing.start = new Date(timing.start);
    }
    const parsed = await parseOne(input, opts);

    progress(opts, 0.2);

    //Return list of devices/streams only
    if (opts.deviceList) return deviceList(parsed);
    if (opts.streamList) return streamList(parsed);

    //Return now if raw wanted
    if (opts.raw) return parsed;

    interpreted = await interpretOne(timing, parsed, opts);
    progress(opts, 0.4);
  } else {
    if (input.some(i => !i.timing))
      throw new Error(
        'per-source timing is necessary in order to merge sources'
      );
    timing = input.map(i => JSON.parse(JSON.stringify(i.timing)));
    timing = timing.map(t => ({ ...t, start: new Date(t.start) }));
    //Sort by in time
    const sortedInput = input
      .concat()
      .sort((a, b) => a.timing.start.getTime() - b.timing.start.getTime());

    //Loop parse all files, with offsets
    const parsed = [];
    for (let i = 0; i < sortedInput.length; i++) {
      if (i > 0) setSourceOffset(timing[i - 1], timing[i]);
      const oneParsed = await parseOne(sortedInput[i], opts);
      parsed.push(oneParsed);
    }
    progress(opts, 0.2);

    //Return list of devices/streams only
    if (opts.deviceList) return parsed.map(p => deviceList(p));
    if (opts.streamList) return parsed.map(p => streamList(p));

    //Return now if raw wanted
    if (opts.raw) return parsed;

    //Interpret all
    const interpretedArr = [];
    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      const interpreted = await interpretOne(timing[i], p, opts, true);
      interpretedArr.push(interpreted);
    }
    progress(opts, 0.3);

    //Merge samples in interpreted obj
    interpreted = await mergeInterpretedSources(interpretedArr);
    progress(opts, 0.4);

    //Set single timing for rest of outer function
    timing = timing[0];
  }

  //Clean unused streams (namely GPS5 used for timing if cached raw data)
  if (opts.stream && opts.stream.length) {
    for (const dev in interpreted) {
      for (const stream in interpreted[dev].streams) {
        if (
          !opts.stream.includes(stream) &&
          !keys.computedStreams.includes(stream)
        ) {
          delete interpreted[dev].streams[stream];
        }
      }
    }
  }

  //Read framerate to convert groupTimes to number if needed
  if (opts.groupTimes === 'frames') {
    if (timing && timing.frameDuration)
      opts.groupTimes = timing.frameDuration * 1000;
    else throw new Error('Frame rate is needed for your current options');
  }

  //Group samples by time if necessary
  if (opts.smooth) interpreted = await smoothSamples(interpreted, opts);

  progress(opts, 0.6);

  //Group samples by time if necessary
  if (opts.groupTimes) interpreted = await groupTimes(interpreted, opts);

  //Add framerate to top level
  if (timing && timing.frameDuration != null)
    interpreted['frames/second'] = 1 / timing.frameDuration;

  progress(opts, 0.9);

  //Process presets
  if (opts.preset === 'gpx') return await toGpx(interpreted, opts);
  if (opts.preset === 'virb') return await toVirb(interpreted, opts);
  if (opts.preset === 'kml') return await toKml(interpreted, opts);
  if (opts.preset === 'geojson') return await toGeojson(interpreted, opts);
  if (opts.preset === 'csv') return await toCsv(interpreted);
  if (opts.preset === 'mgjson') return await toMgjson(interpreted, opts);

  progress(opts, 1);

  return interpreted;
}

module.exports = function (input, options = {}) {
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

  const result = (async () => await process(input, options))();
  return typeof result;
};

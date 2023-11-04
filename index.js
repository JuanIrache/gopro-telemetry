const parseKLV = require('./code/parseKLV');
const groupDevices = require('./code/groupDevices');
const deviceList = require('./code/deviceList');
const streamList = require('./code/streamList');
const keys = require('./code/data/keys');
const timeKLV = require('./code/timeKLV');
const interpretKLV = require('./code/interpretKLV');
const mergeStream = require('./code/mergeStream');
const groupTimes = require('./code/groupTimes');
const smoothSamples = require('./code/smoothSamples');
const processGPS = require('./code/processGPS');
const filterWrongSpeed = require('./code/filterWrongSpeed');
const presetsOpts = require('./code/data/presetsOptions');
const toGpx = require('./code/presets/toGpx');
const toVirb = require('./code/presets/toVirb');
const toKml = require('./code/presets/toKml');
const toGeojson = require('./code/presets/toGeojson');
const toCsv = require('./code/presets/toCsv');
const toMgjson = require('./code/presets/toMgjson');
const mergeInterpretedSources = require('./code/mergeInterpretedSources');
const breathe = require('./code/utils/breathe');
const getOffset = require('./code/utils/getOffset');
const findFirstTimes = require('./code/utils/findFirstTimes');

async function parseOne({ rawData, parsedData }, opts, gpsTimeSrc) {
  if (parsedData) return parsedData;

  await breathe();

  //Parse input
  const parsed = await parseKLV(rawData, opts, { gpsTimeSrc });
  if (!parsed.DEVC) {
    const error = new Error(
      'Invalid GPMF data. Root object must contain DEVC key'
    );
    if (opts.tolerant) {
      await breathe();
      console.error(error);

      return parsed;
    } else throw error;
  }

  return parsed;
}

async function interpretOne({ timing, parsed, opts, timeMeta, gpsTimeSrc }) {
  //Group it by device
  const grouped = await groupDevices(parsed);

  await breathe();

  //Correct GPS height and filter out bad GPS data
  if (
    !opts.ellipsoid ||
    opts.geoidHeight ||
    opts.GPSPrecision != null ||
    opts.GPSFix != null
  ) {
    for (const key in grouped)
      grouped[key] = await processGPS(grouped[key], opts, gpsTimeSrc);
  }

  let interpreted = {};
  //Apply scale and matrix transformations
  for (const key in grouped) {
    await breathe();
    interpreted[key] = await interpretKLV(grouped[key], opts);
  }

  let timed = {};
  //Apply timing (gps and mp4) to every sample
  for (const key in interpreted) {
    await breathe();
    timed[key] = await timeKLV(interpreted[key], {
      timing,
      opts,
      timeMeta,
      gpsTimeSrc
    });
  }

  //Merge samples in sensor entries
  let merged = {};
  for (const key in timed) {
    await breathe();
    merged[key] = await mergeStream(timed[key], opts);
  }

  if (opts.WrongSpeed != null) {
    for (const key in merged) {
      if (merged[key].streams.GPS5) {
        merged[key].streams.GPS5.samples = filterWrongSpeed(
          merged[key].streams.GPS5.samples,
          opts.WrongSpeed
        );
      }
      if (merged[key].streams.GPS9) {
        merged[key].streams.GPS9.samples = filterWrongSpeed(
          merged[key].streams.GPS9.samples,
          opts.WrongSpeed
        );
      }
    }
  }

  return merged;
}

function progress(options, amount) {
  if (options.progress) options.progress(amount);
}

async function process(input, opts) {
  await breathe();
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
  if (opts.GPSFix == null && opts.GPS5Fix != null) opts.GPSFix = opts.GPS5Fix;
  if (opts.GPSPrecision == null && opts.GPS5Precision != null) {
    opts.GPSPrecision = opts.GPS5Precision;
  }

  // Find available GPS type and store first times for potential sorting
  const userGPSChoices = ['GPS9', 'GPS5'].filter(k =>
    (opts.stream || []).includes(k)
  );
  const forceGPSSrc = userGPSChoices.length === 1 ? userGPSChoices[0] : null;
  if (!Array.isArray(input)) input = [input];
  const firstTimes = input.map(i => findFirstTimes(i.rawData, forceGPSSrc));
  let bestGPSTimeSrc;
  if (firstTimes.every(t => t.GPS9Time)) bestGPSTimeSrc = 'GPS9';
  else if (firstTimes.every(t => t.GPSU)) bestGPSTimeSrc = 'GPS5';
  else if (firstTimes.some(t => t.GPS9Time)) bestGPSTimeSrc = 'GPS9';
  else {
    if (opts.timeIn === 'GPS') delete opts.timeIn;
    bestGPSTimeSrc = 'GPS5';
  }
  if ((opts.stream || []).includes('GPS')) {
    opts.stream = opts.stream.map(s => (s === 'GPS' ? bestGPSTimeSrc : s));
  }

  let interpreted;
  let timing;

  // Provide approximate progress updates
  progress(opts, 0.01);

  // Treat single or multiple inputs differently
  if (input.length === 1) input = input[0];
  if (!Array.isArray(input)) {
    if (input.timing) {
      timing = JSON.parse(JSON.stringify(input.timing));
      timing.start = new Date(timing.start);
    }

    await breathe();

    const gpsTimeSrc = bestGPSTimeSrc;
    const parsed = await parseOne(input, opts, gpsTimeSrc);

    progress(opts, 0.2);

    await breathe();

    //Return list of devices/streams only
    if (opts.deviceList) return deviceList(parsed);
    if (opts.streamList) return streamList(parsed);

    //Return now if raw wanted
    if (opts.raw) return parsed;

    await breathe();

    interpreted = await interpretOne({ timing, parsed, opts, gpsTimeSrc });
    progress(opts, 0.4);
  } else {
    if (input.some(i => !i.timing))
      throw new Error(
        'per-source timing is necessary in order to merge sources'
      );

    if (
      input.every(
        i => i.timing.start.getTime() === input[0].timing.start.getTime()
      )
    ) {
      // Some firmwares produce consecutive files with the same creation date.
      // Try to use GPS time or timestamps to solve this
      input.sort((a, b) => {
        const foundA = firstTimes[input.indexOf(a)];
        const foundB = firstTimes[input.indexOf(b)];
        if (foundA.GPS9Time && foundB.GPS9Time) {
          return foundA.GPS9Time - foundB.GPS9Time;
        }
        if (foundA.GPSU && foundB.GPSU) return foundA.GPSU - foundB.GPSU;
        if (foundA.STMP != null && foundB.STMP != null) {
          return foundA.STMP - foundB.STMP;
        }
        return 0;
      });
    }

    timing = input.map(i => JSON.parse(JSON.stringify(i.timing)));
    timing = timing.map(t => ({ ...t, start: new Date(t.start) }));

    const getGPSTimeSrc = i =>
      firstTimes[i][bestGPSTimeSrc]
        ? bestGPSTimeSrc
        : firstTimes[i].GPS9Time
        ? 'GPS9'
        : 'GPS5';

    //Loop parse all files, with offsets
    const parsed = [];
    for (let i = 0; i < input.length; i++) {
      const oneParsed = await parseOne(input[i], opts, getGPSTimeSrc(i));
      parsed.push(oneParsed);
    }
    progress(opts, 0.2);

    await breathe();

    //Return list of devices/streams only
    if (opts.deviceList) return parsed.map(p => deviceList(p));
    if (opts.streamList) return parsed.map(p => streamList(p));

    //Return now if raw wanted
    if (opts.raw) return parsed;

    //Interpret all
    const interpretedArr = [];
    let gpsDate, mp4Date;

    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      await breathe();
      let interpreted;
      let offset = 0;
      if (i > 0) {
        offset = getOffset({ interpretedArr, i, opts, timing });
      }

      const timeMeta = { gpsDate, mp4Date, offset };

      interpreted = await interpretOne({
        timing: timing[i],
        parsed: p,
        opts,
        timeMeta,
        gpsTimeSrc: getGPSTimeSrc(i)
      });

      if (!gpsDate && timeMeta.gpsDate) {
        gpsDate = timeMeta.gpsDate;
      }
      if (!mp4Date && timeMeta.mp4Date) {
        mp4Date = timeMeta.mp4Date;
      }

      interpretedArr.push(interpreted);
    }
    progress(opts, 0.3);

    await breathe();

    //Merge samples in interpreted obj
    interpreted = await mergeInterpretedSources(interpretedArr);
    progress(opts, 0.4);

    //Set single timing for rest of outer function
    timing = timing[0];
  }

  await breathe();

  //Clean unused streams (namely GPS5 & GPS9 used for timing if cached raw data)
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
    if (timing && timing.frameDuration) {
      opts.groupTimes = timing.frameDuration * 1000;
    } else throw new Error('Frame rate is needed for your current options');
  }

  await breathe();

  //Group samples by time if necessary
  if (opts.smooth) interpreted = await smoothSamples(interpreted, opts);

  progress(opts, 0.6);

  await breathe();

  //Group samples by time if necessary
  if (opts.groupTimes) interpreted = await groupTimes(interpreted, opts);

  //Add framerate to top level
  if (timing && timing.frameDuration != null)
    interpreted['frames/second'] = 1 / timing.frameDuration;

  progress(opts, 0.9);

  await breathe();

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

async function GoProTelemetry(input, options = {}, callback) {
  const result = await process(input, options);

  if (!callback) return result;
  callback(result);
}

module.exports = GoProTelemetry;
exports = module.exports;
exports.GoProTelemetry = GoProTelemetry;
exports.goProTelemetry = GoProTelemetry;

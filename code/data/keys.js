const Parser = require('binary-parser').Parser;

//First 2 sections (64 bits) of each KLV (Key, Length, Value)
const keyAndStructParser = new Parser()
  .endianess('big')
  .string('fourCC', { length: 4, encoding: 'ascii' })
  .string('type', { length: 1, encoding: 'ascii' })
  .uint8('size')
  .uint16('repeat');

//Instructions for interpreting data types.
const types = {
  c: { func: 'string', opt: { encoding: 'ascii', stripNull: true } },
  U: { func: 'string', opt: { encoding: 'ascii', stripNull: true } },
  F: { func: 'string', opt: { length: 4, encoding: 'ascii' } },
  b: { size: 1, func: 'int8' },
  B: { size: 1, func: 'uint8' },
  l: { size: 4, func: 'int32' },
  L: { size: 4, func: 'uint32' },
  q: { size: 4, func: 'uint32' }, //Never tested
  Q: { size: 8, func: 'uint64' }, //Never tested
  d: { size: 8, func: 'doublebe' },
  j: { size: 8, func: 'int64' },
  J: { size: 8, func: 'uint64', forceNum: true },
  f: { size: 4, func: 'floatbe' },
  s: { size: 2, func: 'int16' },
  S: { size: 2, func: 'uint16' },
  '': { size: 1, func: 'bit1' },
  '?': { complex: true },
  '\u0000': { nested: true }
};

//Make some fourCC keys human readable
const translations = {
  SIUN: 'units',
  UNIT: 'units',
  STNM: 'name',
  RMRK: 'comment',
  DVNM: 'device name'
};

//Ignore some, for now
const ignore = ['EMPT', 'TSMP', 'TICK', 'TOCK'];

//Make some fourCC keys sticky and human readable
const stickyTranslations = {
  TMPC: 'temperature [°C]',
  GPSF: 'fix',
  GPSP: 'precision',
  GPSA: 'altitude system',
  STMP: 'timestamps [µs]'
};

//Some metadata is not described internally, but the format can be deduced from documentation:
//https://github.com/gopro/gpmf-parser#hero7-black-adds-removes-changes-otherwise-supports-all-hero6-metadata
const forcedStruct = {
  FACE: [
    'ID,x,y,w,h', // HERO6
    'ID,x,y,w,h,null,null,unknown,null,null,null,null,null,null,null,null,null,null,null,null,null,null,smile', // HERO7
    'ID,x,y,w,h,confidence %,smile %', // HERO8
    'ver,confidence %,ID,x,y,w,h,smile %, blink %' // HERO10
  ]
};

//mgjson output splits arrays in groups of 3 values, we can change that here,
//for example to express coordinates of FACE bounding boxes by pairs
const mgjsonMaxArrs = {
  FACE: 2
};

//Interpret the previous string as an array
function generateStructArr(key, partial) {
  const example = partial.find(arr => Array.isArray(arr) && arr.length);
  if (!example) return;
  const length = example.length;
  const strings = forcedStruct[key];
  if (!strings) return;
  const str = strings.find(str => str.split(',').length === length);
  if (!str) return null;
  let resultingArr = [];
  str.split(',').forEach(w => {
    resultingArr.push(w);
  });
  resultingArr = resultingArr.map(v => (v === 'null' ? null : v));
  return resultingArr;
}

//Convert some keys and values to human readable, based on documentation, no internal data
function idKeysTranslation(key) {
  return key.replace(/_?FOUR_?CC/i, '');
}

function idValuesTranslation(val, key) {
  const pairs = {
    CLASSIFIER: {
      SNOW: 'snow',
      URBA: 'urban',
      INDO: 'indoor',
      WATR: 'water',
      VEGE: 'vegetation',
      BEAC: 'beach'
    }
  };
  if (pairs[key]) return pairs[key][val] || val;
  return val;
}

//Names in case stream is not defined with name
const names = {
  ACCL: '3-axis accelerometer',
  GYRO: '3-axis gyroscope',
  ISOG: 'Image sensor gain',
  SHUT: 'Exposure time',
  GPS5: 'Latitude, longitude, altitude (WGS 84), 2D ground speed, and 3D speed',
  GPS9: 'Lat., Long., Alt., 2D, 3D, days, secs, DOP, fix',
  GPSU: 'UTC time and data from GPS',
  GPSF: 'GPS Fix',
  GPSP: 'GPS Precision - Dilution of Precision (DOP x100)',
  STMP: 'Microsecond timestamps',
  FACE: 'Face detection boundaring boxes',
  FCNM: 'Faces counted per frame',
  ISOE: 'Sensor ISO',
  ALLD: 'Auto Low Light frame Duration',
  WBAL: 'White Balance in Kelvin',
  WRGB: 'White Balance RGB gains',
  YAVG: 'Luma (Y) Average over the frame',
  HUES: 'Predominant hues over the frame',
  UNIF: 'Image uniformity',
  SCEN: 'Scene classifier in probabilities',
  SROT: 'Sensor Read Out Time',
  CORI: 'Camera ORIentation',
  IORI: 'Image ORIentation',
  GRAV: 'GRAvity Vector',
  WNDM: 'Wind Processing',
  MWET: 'Microphone is WET',
  AALP: 'Audio Levels',
  DISP: 'Disparity track (360 modes)',
  MAGN: 'MAGNnetometer',
  MSKP: 'Main video frame SKiP',
  LSKP: 'Low res video frame SKiP',
  LOGS: 'health logs',
  VERS: 'version of the metadata library that created the camera data',
  FMWR: 'Firmware version',
  LINF: 'Internal IDs',
  CINF: 'Internal IDs',
  CASN: 'Camera Serial Number',
  MINF: 'Camera model',
  MUID: 'Media ID',
  CPID: 'Capture Identifier',
  CPIN: 'Capture number in group',
  CMOD: 'Camera Mode',
  MTYP: 'Media type',
  HDRV: 'HDR Video',
  OREN: 'Orientation',
  DZOM: 'Digital Zoom enable',
  DZST: 'Digital Zoom Setting',
  SMTR: 'Spot Meter',
  PRTN: 'Protune Enabled',
  PTWB: 'Protune White balance',
  PTSH: 'Protune Sharpness',
  PTCL: 'Protune Color',
  EXPT: 'Exposure Type',
  PIMX: 'Protune ISO Max',
  PIMN: 'Protune ISO Min',
  PTEV: 'Protune EV',
  RATE: 'Burst Rate, TimeWarp Rate, Timelapse Rate',
  EISE: 'Electric Stabilization',
  EISA: 'EIS Applied',
  HCTL: 'In camera Horizon control',
  AUPT: 'Audio Protune',
  APTO: 'Audio Protune Option',
  AUDO: 'Audio Option',
  AUBT: 'Audio BlueTooth',
  PRJT: 'Lens Projection',
  CDAT: 'Creation Date/Time',
  SCTM: 'Schedule Capture Time',
  PRNA: 'Preset IDs',
  PRNU: 'Preset IDs',
  SCAP: 'Schedule Capture',
  CDTM: 'Capture Delay Timer (in ms)',
  DUST: 'Duration Settings',
  VRES: 'Video Resolution',
  VFPS: 'Video Framerate ratio',
  HSGT: 'Hindsight Settings',
  BITR: 'Bitrate',
  MMOD: 'Media Mod',
  RAMP: 'Speed Ramp Settings',
  TZON: 'Time Zone offset in minutes',
  DZMX: 'Digital Zoom amount',
  CTRL: 'Control Level',
  PWPR: 'Power Profile',
  ORDP: 'Orientation Data Present',
  CLDP: 'Classification Data Present',
  PIMD: 'Protune ISO Mode',
  ABSC: 'AutoBoost SCore - Used for Autoboost variable prescription modes',
  ZFOV: 'Diagon Field Of View in degrees (from corner to corner)',
  VFOV: 'Visual FOV style',
  PYCF: 'Polynomial power',
  POLY: 'Polynomial values',
  ZMPL: 'Zoom scale normalization',
  ARUW: 'Aspect Ratio of the UnWarped input image',
  ARWA: 'Aspect Ratio of the WArped output image',
  MXCF: 'Mapping X CoeFficients, Superview/HyperView',
  MAPX: 'new_x = ax + bx^3 + cx^5',
  MYCF: 'Mapping Y CoeFficients, Superview/HyperView',
  MAPY: 'new_y = ay + by^3 + cy^5 + dyx^2 + ey^3x^2 + fyx^4'
};

//Keys that are known to hold multiple samples per sample
const knownMulti = {
  FACE: true,
  HUES: true,
  SCEN: true
};

//Streams that we can add programmatically based on other data
const computedStreams = ['dateStream'];

//Treat mp4 header samples as stream
const mp4ValidSamples = ['HLMT'];

module.exports = {
  keyAndStructParser,
  types,
  translations,
  ignore,
  stickyTranslations,
  generateStructArr,
  mgjsonMaxArrs,
  idKeysTranslation,
  idValuesTranslation,
  names,
  knownMulti,
  computedStreams,
  mp4ValidSamples
};

const Parser = require('@gmod/binary-parser').Parser;

//First 2 sections (64 bits) of each KLV (Key, Length, Value)
const keyAndStructParser = new Parser()
  .endianess('big')
  .string('fourCC', { length: 4, encoding: 'ascii' })
  .string('type', { length: 1, encoding: 'ascii' })
  .uint8('size')
  .int16('repeat');

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
  d: { size: 8, func: 'double' }, //Never tested
  j: { size: 8, func: 'int64' },
  J: { size: 8, func: 'uint64' },
  f: { size: 4, func: 'float' },
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
  GPSU: 'UTC time and data from GPS',
  GPSF: 'GPS Fix',
  GPSP: 'GPS Precision - Dilution of Precision (DOP x100)',
  STMP: 'Microsecond timestamps',
  MAGN: 'Magnetometer',
  FACE: 'Face detection boundaring boxes',
  FCNM: 'Faces counted per frame',
  ISOE: 'Sensor ISO',
  ALLD: 'Auto Low Light frame Duration',
  WBAL: 'White Balance in Kelvin',
  WRGB: 'White Balance RGB gains',
  YAVG: 'Luma (Y) Average over the frame',
  HUES: 'Predominant hues over the frame',
  UNIF: 'Image uniformity',
  SCEN: 'Scene classifier in probabilities'
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

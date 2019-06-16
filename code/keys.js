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

//Merge known fourCC strings
//is there no better way than hardcoding it?
const mergeStrings = ['STNM', 'RMRK', 'TYPE', 'DVNM'];

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
  STMP: 'timestamps [µs]' //Maybe useful for accurate timing, but does not look consecutive or proportional
};

//Some metadata is not described internally, but the format can be deduced from documentation:
//https://github.com/gopro/gpmf-parser#hero7-black-adds-removes-changes-otherwise-supports-all-hero6-metadata
const forcedStruct = {
  FACE: 'ID,x,y,w,h,unused[17],smile'
};

//mgjson output splits arrays in groups of 3 values, we can change that here,
//for example to express coordinates of FACE bounding boxes by pairs
const mgjsonMaxArrs = {
  FACE: 2
};

//Interpret the previous string as an array
function generateStructArr(key) {
  const str = forcedStruct[key];
  if (!str) return null;
  let resultingArr = [];
  str.split(',').forEach(w => {
    if (/.+\[\d+\]$/.test(w)) {
      for (let i = 0; i < w.match(/(.+)\[(\d+)\]$/)[2]; i++) resultingArr.push(w.match(/(.+)\[(\d+)\]$/)[1]);
    } else resultingArr.push(w);
  });
  resultingArr = resultingArr.map(v => (v === 'unused' ? null : v));
  return resultingArr;
}

module.exports = {
  keyAndStructParser,
  types,
  mergeStrings,
  translations,
  ignore,
  stickyTranslations,
  generateStructArr,
  mgjsonMaxArrs
};

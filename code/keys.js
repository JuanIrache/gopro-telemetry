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

//Instructions for reading known fourCC keys
//is there no better way to know which strings to merge than hardcoding it?
const fourCCs = {
  STNM: { merge: true },
  RMRK: { merge: true },
  TYPE: { merge: true },
  DVNM: { merge: true }
};

//Make some fourCC keys human readable
const translations = {
  SIUN: 'units',
  UNIT: 'units',
  STNM: 'name',
  RMRK: 'comment'
};

//Ignore some, for now
const ignore = ['EMPT', 'TSMP', 'TICK', 'TOCK'];

//Make some fourCC keys sticky and human readable
const stickyTranslations = {
  TMPC: 'temperature (Cº)',
  GPSF: 'fix',
  GPSP: 'precision',
  TIMO: 'offset seconds'
};

module.exports = { keyAndStructParser, types, fourCCs, translations, ignore, stickyTranslations };

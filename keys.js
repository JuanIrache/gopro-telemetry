const Parser = require('binary-parser').Parser;

//First 2 sections (64 bits) of each KLV (Key, Length, Value)
const keyAndStructParser = new Parser()
  .endianess('big')
  .string('fourCC', { length: 4, encoding: 'ascii' })
  .string('type', { length: 1, encoding: 'ascii' })
  .uint8('size')
  .int16('repeat');

//Instructions for interpreting data types. Should cover them all
const types = {
  c: { func: 'string', opt: { encoding: 'ascii', stripNull: true } },
  U: { func: 'string', opt: { encoding: 'ascii', stripNull: true } },
  b: { size: 1, func: 'int8' },
  B: { size: 1, func: 'uint8' },
  l: { size: 4, func: 'int32' },
  L: { size: 4, func: 'uint32' },
  J: { size: 8, func: 'uint64' }, //binary-parser does not support 64bits will use @gmod/binary-parser
  f: { size: 4, func: 'float' },
  s: { size: 2, func: 'int16' },
  S: { size: 2, func: 'uint16' },
  '?': { complex: true },
  '\u0000': { nested: true }
};

//Instructions for reading known fourCC keys
//is there no better way to know which strings to merge than hardcoding it?
const fourCCs = {
  STNM: { merge: true },
  RMRK: { merge: true },
  DVNM: { merge: true }
};

module.exports = { keyAndStructParser, types, fourCCs };

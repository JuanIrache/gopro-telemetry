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
  j: { size: 8, func: 'int64' },
  J: { size: 8, func: 'uint64' },
  f: { size: 4, func: 'float' },
  s: { size: 2, func: 'int16' },
  S: { size: 2, func: 'uint16' },
  '': { size: 1, func: 'bit1' },
  '?': { complex: true },
  '\u0000': { nested: true }
};
// Pending types:
// d	|	64-bit double precision (IEEE 754)	|	double
// G	|	128-bit ID (like UUID)	|	uint8_t guid[16]
// q	|	32-bit Q Number Q15.16	|	uint32_t	|	16-bit integer (A) with 16-bit fixed point (B) for A.B value (range -32768.0 to 32767.99998)
// Q	|	64-bit Q Number Q31.32	|	uint64_t	|	32-bit integer (A) with 32-bit fixed point (B) for A.B value.

//Instructions for reading known fourCC keys
//is there no better way to know which strings to merge than hardcoding it?
const fourCCs = {
  STNM: { merge: true },
  RMRK: { merge: true },
  TYPE: { merge: true },
  DVNM: { merge: true }
};

module.exports = { keyAndStructParser, types, fourCCs };

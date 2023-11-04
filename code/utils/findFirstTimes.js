let readUInt8, readUInt16BE, readInt32BE, readInt64BEasFloat;

if (DataView) {
  readUInt8 = buffer => new DataView(buffer.buffer).getUint8(0);
  readUInt16BE = buffer => new DataView(buffer.buffer).getUint16(0);
  readInt32BE = buffer => new DataView(buffer.buffer).getInt32(0);
  readInt64BEasFloat = (buffer, offset) =>
    Number(new DataView(buffer.buffer).getFloat64(offset));
} else if (typeof Buffer !== 'undefined') {
  readUInt8 = buffer => buffer.readUInt8(0);
  readUInt16BE = buffer => buffer.readUInt16BE(0);
  readInt32BE = buffer => buffer.readInt32BE(0);
  readInt64BEasFloat = (buffer, offset) => buffer.readDoubleBE(offset);
} else {
  throw new Error(
    'Please install a compatible `Buffer` or `DataView` polyfill'
  );
}

// Try to find timing data quickly as last resort for sorting files
module.exports = (data, forceGPSSrc) => {
  let GPSU;
  let GPS9Time;
  let STMP;

  const checkGPS9 = forceGPSSrc !== 'GPS5';
  const checkGPS5 = forceGPSSrc !== 'GPS9';

  // loop for an arbitrarily short amount of times, otherwise give up search
  for (let i = 0; i < 100000 && i + 4 < (data || []).length; i += 4) {
    //Find potential fourCCs, letter by letter to discard quicker
    if (
      checkGPS5 &&
      'G' === String.fromCharCode(data[i + 0]) &&
      'P' === String.fromCharCode(data[i + 1]) &&
      'S' === String.fromCharCode(data[i + 2]) &&
      'U' === String.fromCharCode(data[i + 3])
    ) {
      const sizeIdx = i + 5;
      const repeatIdx = i + 6;
      const valIdx = i + 8;
      const size = readUInt8(data.slice(sizeIdx, sizeIdx + 1));
      const repeat = readUInt16BE(data.slice(repeatIdx, repeatIdx + 2));
      const value = data.slice(valIdx, valIdx + size * repeat);
      GPSU = +value.map(i => String.fromCharCode(i)).join('');
    } else if (
      checkGPS9 &&
      'G' === String.fromCharCode(data[i + 0]) &&
      'P' === String.fromCharCode(data[i + 1]) &&
      'S' === String.fromCharCode(data[i + 2]) &&
      '9' === String.fromCharCode(data[i + 3])
    ) {
      const valIdx = i + 8;
      const daysValue = data.slice(valIdx + 20, valIdx + 24);
      const secondsValue = data.slice(valIdx + 24, valIdx + 28);
      const days = readInt32BE(daysValue);
      const seconds = readInt32BE(secondsValue) / 1000;
      GPS9Time = seconds + days * 86400;
    } else if (
      'S' === String.fromCharCode(data[i + 0]) &&
      'T' === String.fromCharCode(data[i + 1]) &&
      'M' === String.fromCharCode(data[i + 2]) &&
      'P' === String.fromCharCode(data[i + 3])
    ) {
      STMP = readInt64BEasFloat(data, i + 8);
    }
    if (
      (GPS9Time != null || !checkGPS9) &&
      (GPSU != null || !checkGPS5) &&
      STMP != null
    )
      break;
  }
  return { GPSU, STMP, GPS9Time };
};

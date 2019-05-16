function interpretKLV(klv, options) {
  let result = JSON.parse(JSON.stringify(klv));
  if (result.interpretSamples) {
    let interpreted = false;
    if (result.hasOwnProperty('SCAL')) {
      result[result.interpretSamples] = result[result.interpretSamples].map(s => {
        if (typeof s === 'number') return s / result.SCAL;
        else {
          if (result.SCAL.length === s.length) return s.map((ss, i) => ss / result.SCAL[i]);
          else return s.map((ss, i) => ss / result.SCAL);
        }
      });
      delete result.SCAL;
      interpreted = true;
    }
    if (result.hasOwnProperty('ORIN') && result.hasOwnProperty('ORIO')) {
      //transform
      delete result.ORIN;
      delete result.ORIO;
      interpreted = true;
    }
    if (result.hasOwnProperty('MTRX')) {
      //TODO apply transformation here instead of ORIN, ORIO?
      delete result.MTRX;
      interpreted = true;
    }
    if (result.hasOwnProperty('TYPE')) {
      delete result.TYPE;
      interpreted = true;
    }
    if (!interpreted) result[result.interpretSamples] = result[result.interpretSamples].map(s => interpretKLV(s, options));
    delete result.interpretSamples;
  }
  return result;
}

module.exports = interpretKLV;

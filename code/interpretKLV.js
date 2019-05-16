function interpretKLV(klv, options) {
  let nextSCAL;
  for (const key in klv) {
    if (key === 'SCAL') nextSCAL = klv[key];
  }
}

module.exports = interpretKLV;

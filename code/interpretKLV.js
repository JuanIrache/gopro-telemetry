function interpretKLV(klv, options) {
  let nextSCAL;
  let lastKey;
  for (const key in klv) {
    if (key === 'SCAL') nextSCAL = klv[key];
    else lastKey = key;
  }
  if (lastKey && nextSCAL != null && klv[lastKey] && klv[lastKey].length) {
    for (const key in klv[lastKey]) {
      if (typeof klv[lastKey][key] === 'number') klv[lastKey][key] /= nextSCAL;
      else if (typeof klv[lastKey][key] === 'object' && klv[lastKey][key].length === nextSCAL.length) {
        for (let i = 0; i < klv[lastKey][key].length; i++)
          if (typeof klv[lastKey][key][i] === number) klv[lastKey][key][i] /= nextSCAL[i];
          else console.log('wrong inner values', klv[lastKey][key][i], nextSCAL[i]);
      } else console.log('wrong values', klv[lastKey][key], nextSCAL);
    }
  } else if (klv[lastKey] && typeof klv[lastKey] == 'object') {
    interpretKLV(klv[lastKey], options);
  } else console.log('not processed', !!lastKey, nextSCAL != null, klv[lastKey], klv);
}

module.exports = interpretKLV;

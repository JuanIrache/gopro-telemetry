//Apply scale and matrix transformations to data
function interpretKLV(klv, options) {
  let result = JSON.parse(JSON.stringify(klv));
  if (result != null && result.interpretSamples) {
    let interpreted = false;
    try {
      if (result.hasOwnProperty('SCAL')) {
        //Loop through the samples and scale them
        result[result.interpretSamples] = result[result.interpretSamples].map(s => {
          //If single value, scale, otherwise loop through array
          if (typeof s === 'number') return s / result.SCAL;
          else if (s != null) {
            //If scaling is array, apply to each "axis", otherwise apply to all
            if (result.SCAL.length === s.length) return s.map((ss, i) => ss / result.SCAL[i]);
            else return s.map((ss, i) => ss / result.SCAL);
          }
        });

        //Done with scaling data
        delete result.SCAL;
        interpreted = true;
      }

      if (result.hasOwnProperty('ORIN') && result.hasOwnProperty('ORIO')) {
        //set label for transformation Matrix
        const labels = `(${result.ORIO.map(o => o.toLowerCase()).join(',')})`;
        if (result.STNM) result.STNM += ` ${labels}`;
        else result.STNM = labels;

        //Transform with this if no matrix present
        if (!result.hasOwnProperty('MTRX')) {
          result[result.interpretSamples] = result[result.interpretSamples].map(s => {
            let newS = [];
            const len = result.ORIN.length;
            for (let y = 0; y < len; y++) {
              for (let x = 0; x < len; x++) {
                if (result.ORIN[y].toUpperCase() === result.ORIO[x]) {
                  if (result.ORIN[y] === result.ORIO[x]) newS[x] = s[y];
                  else newS[x] = -s[y];
                }
              }
            }
            return newS;
          });
        }
        //Done with ORIN ORIO
        delete result.ORIN;
        delete result.ORIO;
        interpreted = true;
      }

      if (result.hasOwnProperty('MTRX')) {
        //Transform axis, including potential calibration data
        result[result.interpretSamples] = result[result.interpretSamples].map(s => {
          let newS = [];
          const len = Math.sqrt(result.MTRX.length);
          for (let y = 0; y < len; y++) {
            for (let x = 0; x < len; x++) {
              if (result.MTRX[y * len + x] !== 0) newS[x] = s[y] * result.MTRX[y * len + x];
            }
          }
          return newS;
        });
        //Done with matrix
        delete result.MTRX;
        interpreted = true;
      }

      //Types was already used in raw, just delete the entry
      if (result.hasOwnProperty('TYPE')) {
        delete result.TYPE;
        interpreted = true;
      }

      //If we did not interpret, look deeper
      if (!interpreted) result[result.interpretSamples] = result[result.interpretSamples].map(s => interpretKLV(s, options));
    } catch (error) {
      setImmediate(() => console.error(error));
    }
    //Done with interpretation
    // delete result.interpretSamples;
  }
  return result;
}

module.exports = interpretKLV;

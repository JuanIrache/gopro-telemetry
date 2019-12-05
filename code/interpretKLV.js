const { names } = require('./keys');
const rmrkToNameUnits = require('./rmrkToNameUnits');

//Apply scale and matrix transformations to data
function interpretKLV(klv, options) {
  let result = JSON.parse(JSON.stringify(klv));
  if (result != null && result.interpretSamples) {
    const toInterpret = ['SCAL', 'altitudeFix', 'ORIN', 'ORIO', 'MTRX', 'TYPE'];
    const someMatch = function(a1, a2) {
      for (const elt of a1) if (a2.includes(elt)) return true;
      return false;
    };
    //if there are keys to interpret
    if (someMatch(toInterpret, Object.keys(result))) {
      //set label based on transformation
      if (result.hasOwnProperty('ORIN') && result.hasOwnProperty('ORIO')) {
        const labels = `(${result.ORIO.map(o => o.toLowerCase()).join(',')})`;
        if (result.STNM) result.STNM += ` ${labels}`;
        else result.STNM = labels;
      }
      //Loop through the samples to interpret them
      result[result.interpretSamples] = result[result.interpretSamples].map(
        s => {
          //If scaling data
          if (result.hasOwnProperty('SCAL')) {
            //If single value, scale, otherwise loop through array
            if (typeof s === 'number') s = s / result.SCAL;
            else if (s != null) {
              //If scaling is array, apply to each "axis", otherwise apply to all
              if (result.SCAL.length === s.length)
                s = s.map((ss, i) =>
                  typeof ss === 'number' ? ss / result.SCAL : ss[i]
                );
              else
                s = s.map(ss =>
                  typeof ss === 'number' ? ss / result.SCAL : ss
                );
            }
          }

          //Fix altitude
          if (
            result.hasOwnProperty('altitudeFix') &&
            result.GPS5 &&
            s &&
            s.length > 2
          )
            s[2] = s[2] - result.altitudeFix;

          if (result.hasOwnProperty('ORIN') && result.hasOwnProperty('ORIO')) {
            //Transform with this if no matrix present, otherwise will transform with matrix later
            if (!result.hasOwnProperty('MTRX')) {
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
              s = newS;
            }
          }

          if (result.hasOwnProperty('MTRX')) {
            //Transform axis, including potential calibration data
            let newS = [];
            const len = Math.sqrt(result.MTRX.length);
            for (let y = 0; y < len; y++) {
              for (let x = 0; x < len; x++) {
                if (result.MTRX[y * len + x] !== 0)
                  newS[x] = s[y] * result.MTRX[y * len + x];
              }
            }
            s = newS;
          }

          //Add name if missing and possible
          if (!result.hasOwnProperty('STNM')) {
            if (names[result.interpretSamples]) {
              result.STNM = names[result.interpretSamples];
            } else if (result.RMRK && /^struct: (.*)/.test(result.RMRK)) {
              const { name, units } = rmrkToNameUnits(result.RMRK);
              result.STNM = name;
              if (!result.hasOwnProperty('UNIT')) result.UNIT = units;
            }
          }

          return s;
        }
      );
      //If we did not interpret, look deeper
    } else
      result[result.interpretSamples] = result[result.interpretSamples].map(s =>
        interpretKLV(s, options)
      );
    toInterpret.forEach(k => delete result[k]);
  }
  return result;
}

module.exports = interpretKLV;

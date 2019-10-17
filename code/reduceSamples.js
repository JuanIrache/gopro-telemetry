//Smoothen one sample with the surrounding ones
function reduceSamples(samples) {
  //Get all unique keys
  const keys = new Set(samples.reduce((acc, curr) => acc.concat(Object.keys(curr)), []));
  let result = Array.isArray(samples[0]) ? [] : {};
  //Loop the keys
  keys.forEach(k => {
    //With valid values
    const validVals = samples.map(s => s[k]).filter(v => v != null);
    //If number, calculate average dividing valid values by total
    if (!isNaN(validVals[0])) result[k] = validVals.reduce((acc, curr, i, arr) => acc + curr / arr.length, 0);
    //If date, calculate average dividing all by total
    else if (k === 'date') result[k] = new Date(validVals.reduce((acc, curr, i, arr) => acc + new Date(curr).getTime() / arr.length, 0));
    //If object (or more likely array) merge the samples recursively
    else if (typeof validVals[0] === 'object') result[k] = reduceSamples(validVals);
    //Preserve null values
    else if (validVals[0] === undefined) result[k] = null;
    //If string or other, use the first valid value
    else result[k] = validVals[0];
  });
  return result;
}

module.exports = reduceSamples;

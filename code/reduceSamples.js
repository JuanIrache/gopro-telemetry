//Smoothen one sample with the surrounding ones
function reduceSamples(samples) {
  //Get all unique keys
  const keys = new Set(samples.reduce((acc, curr) => acc.concat(Object.keys(curr.sample)), []));
  let result = Array.isArray(samples[0].sample) ? [] : {};
  //Loop the keys
  keys.forEach(k => {
    //With valid values
    const validVals = samples
      .map(s => ({ sample: s.sample[k], weight: s.weight }))
      .filter(v => v.sample != null);
    //Get total weight of samples
    const totalWeight = validVals.reduce((acc, cur) => acc + cur.weight, 0);

    //If number, calculate average dividing valid values by total
    if (!isNaN(validVals[0].sample))
      result[k] = validVals.reduce(
        (acc, curr, i, arr) => acc + (curr.sample * curr.weight) / totalWeight,
        0
      );
    //If date, calculate average dividing all by total
    else if (k === 'date')
      result[k] = new Date(
        validVals.reduce(
          (acc, curr, i, arr) =>
            acc + (new Date(curr.sample).getTime() * curr.weight) / totalWeight,
          0
        )
      );
    //If object (or more likely array) merge the samples recursively
    else if (typeof validVals[0] === 'object') result[k] = reduceSamples(validVals);
    //Preserve null values
    else if (validVals[0] === undefined) result[k] = null;
    //If string or other, use the first valid value
    else result[k] = validVals[0].sample;
  });
  return result;
}

module.exports = reduceSamples;

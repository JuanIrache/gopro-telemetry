//Receives options from main function
let timeOut;

//From many samples, build one
function mergeSamples(samples) {
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
    if (k === 'date') result[k] = new Date(validVals.reduce((acc, curr, i, arr) => acc + new Date(curr).getTime() / arr.length, 0));
    //If object (or more likely array) merge the samples recursively
    else if (typeof validVals[0] === 'object') result[k] = mergeSamples(validVals);
    //Preserve null values
    else if (validVals[0] === undefined) result[k] = null;
    //If string or other, use the first valid value
    else result[k] = validVals[0];
  });
  //If cts was temporary, remove it
  if (timeOut === 'date') delete result.cts;
  return result;
}

//Build one sample by interpolating the previous and the next
function interpolateSample(samples, i, currentTime) {
  const baseTime = samples[i].cts;
  const difference = samples[i + 1].cts - baseTime;
  //How much we need to move from i towards i+1
  const proportion = (currentTime - baseTime) / difference;
  //Get all unique keys
  const keys = new Set([samples[i], samples[i + 1]].reduce((acc, curr) => acc.concat(Object.keys(curr)), []));
  let result = Array.isArray(samples[0]) ? [] : {};
  //Loop the keys
  keys.forEach(k => {
    const validVals = [samples[i], samples[i + 1]].map(s => s[k]).filter(v => v != null);
    //If no 2 valid values, assign the first. This covers nulls too
    if (validVals.length < 2) result[k] = validVals[0] || null;
    //If number, calculate proportion
    else if (typeof validVals[0] === 'number') result[k] = validVals[0] + (validVals[1] - validVals[0]) * proportion;
    //If date, calculate proportion
    else if (k === 'date') {
      result[k] = new Date(
        new Date(validVals[0]).getTime() + (new Date(validVals[1]).getTime() - new Date(validVals[0]).getTime()) * proportion
      );
      //If object (or more likely array) interpolate the samples recursively
    } else if (typeof validVals[0] === 'object') result[k] = interpolateSample(validVals, i, currentTime);
    //If string or other, use the first valid value
    else result[k] = validVals[0];
  });

  //If cts was temporary, remove it
  if (timeOut === 'date') delete result.cts;
  return result;
}

module.exports = function(klv, { groupTimes, timeOut }) {
  timeOut = timeOut;
  let result = JSON.parse(JSON.stringify(klv));
  for (const key in result) {
    if (result[key].streams) {
      for (const k in result[key].streams) {
        const samples = result[key].streams[k].samples;
        if (samples) {
          let currentTime = 0;
          let newSamples = [];
          let reachedEnd = false;
          let i = 0;
          while (!reachedEnd) {
            let group = [];
            while (samples[i].cts < currentTime + groupTimes) {
              group.push(samples[i]);
              if (i + 1 === samples.length) {
                reachedEnd = true;
                break;
              } else i++;
            }
            if (group.length > 1) newSamples.push(mergeSamples(group));
            else if (group.length === 1) newSamples.push(group[0]);
            else if (i < samples.length) newSamples.push(interpolateSample(samples, i - 1, currentTime));
            currentTime += groupTimes;
          }
          result[key].streams[k].samples = newSamples;
        }
      }
    }
  }
  return result;
};

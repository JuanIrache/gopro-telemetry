const reduceSamples = require('./reduceSamples');

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
  return result;
}

//Makes sure there is one sample per each specified time chunk
module.exports = function(klv, { groupTimes, timeOut }) {
  //Copy timeout value for other functions
  timeOut = timeOut;
  //Copy input
  let result = JSON.parse(JSON.stringify(klv));
  //Loop devices and streams
  for (const key in result) {
    if (result[key].streams) {
      for (const k in result[key].streams) {
        //Gather samples
        const samples = result[key].streams[k].samples;
        if (samples) {
          let currentTime = 0;
          let newSamples = [];
          let reachedEnd = false;
          let i = 0;
          //Loop until the end of the array
          while (!reachedEnd) {
            let group = [];
            //Loop one time per each desired time chunk
            while (samples[i].cts < currentTime + groupTimes) {
              //Gather all the samples within that chunk
              group.push(samples[i]);
              if (i + 1 === samples.length) {
                //Until the end is reached
                reachedEnd = true;
                break;
                //Check the next sample
              } else i++;
            }
            //Decide wether to merge, copy or interpolate samples based on the amount found under the time chunk
            if (group.length > 1) newSamples.push(reduceSamples(group));
            else if (group.length === 1) newSamples.push(group[0]);
            else if (i > 0 && i < samples.length) newSamples.push(interpolateSample(samples, i - 1, currentTime));
            //If cts was temporary, remove it
            if (timeOut === 'date') delete newSamples[newSamples.length - 1].cts;
            //Add time to analyse next chunk
            currentTime += groupTimes;
          }
          //Replace samples with merged/interpolated ones
          result[key].streams[k].samples = newSamples;
        }
      }
    }
  }
  return result;
};

const reduceSamples = require('./utils/reduceSamples');
const breathe = require('./utils/breathe');

function process2Vals(vals, prop, k) {
  //If no 2 valid values, assign the first. This covers nulls too
  if (vals.length < 2) return vals[0] || null;
  //If number, calculate proportion
  else if (typeof vals[0] === 'number')
    return vals[0] + (vals[1] - vals[0]) * prop;
  //If date, calculate proportion
  else if (k === 'date') {
    return new Date(
      new Date(vals[0]).getTime() +
        (new Date(vals[1]).getTime() - new Date(vals[0]).getTime()) * prop
    );
    //If object (or more likely array) interpolate the sample properties recursively
  } else if (typeof vals[0] === 'object') {
    let result;
    try {
      result = JSON.parse(JSON.stringify(vals[0]));
    } catch (error) {
      result = vals[0];
    }
    for (const key in result)
      result[key] = process2Vals([vals[0][key], vals[1][key]], prop);
    return result;
    //If string or other, use the first valid value
  } else return vals[0];
}

//Build one sample by interpolating the previous and the next
function interpolateSample(samples, i, currentTime) {
  const baseTime = samples[i].cts;
  const difference = samples[i + 1].cts - baseTime;
  //How much we need to move from i towards i+1
  const proportion = (currentTime - baseTime) / difference;
  //Get all unique keys
  const keys = new Set(
    [samples[i], samples[i + 1]].reduce(
      (acc, curr) => acc.concat(Object.keys(curr)),
      []
    )
  );
  let result = Array.isArray(samples[0]) ? [] : {};
  //Loop the keys
  keys.forEach(k => {
    const validVals = [samples[i], samples[i + 1]]
      .map(s => s[k])
      .filter(v => v != null);
    result[k] = process2Vals(validVals, proportion, k);
  });
  return result;
}

//Makes sure there is one sample per each specified time chunk
module.exports = async function (
  klv,
  { groupTimes, timeOut, disableInterpolation, disableMerging }
) {
  //Copy input
  let result;
  try {
    result = JSON.parse(JSON.stringify(klv));
  } catch (error) {
    result = klv;
  }
  //Loop devices and streams
  for (const key in result) {
    if (result[key].streams) {
      for (const k in result[key].streams) {
        await breathe();
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
              if (i + 1 >= samples.length) {
                //Until the end is reached
                reachedEnd = true;
                break;
                //Check the next sample
              } else i++;
              //One sample is just fine if disableMerging
              if (disableMerging) break;
            }
            //Decide wether to merge, copy or interpolate samples based on the amount found under the time chunk
            if (group.length > 1) newSamples.push(reduceSamples(group));
            else if (i > 0 && i < samples.length && !disableInterpolation) {
              newSamples.push(interpolateSample(samples, i - 1, currentTime));
            } else if (group.length === 1) newSamples.push(group[0]);
            //If cts was temporary, remove it
            if (timeOut === 'date' && newSamples.length)
              delete newSamples[newSamples.length - 1].cts;
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

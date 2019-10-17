const reduceSamples = require('./reduceSamples');

function process2Vals(vals, prop, k) {
  //If no 2 valid values, assign the first. This covers nulls too
  if (vals.length < 2) return vals[0] || null;
  //If number, calculate proportion
  else if (typeof vals[0] === 'number') return vals[0] + (vals[1] - vals[0]) * prop;
  //If date, calculate proportion
  else if (k === 'date') {
    return new Date(
      new Date(vals[0]).getTime() +
        (new Date(vals[1]).getTime() - new Date(vals[0]).getTime()) * prop
    );
    //If object (or more likely array) interpolate the sample properties recursively
  } else if (typeof vals[0] === 'object') {
    let result = JSON.parse(JSON.stringify(vals[0]));
    for (const key in result) result[key] = process2Vals([vals[0][key], vals[1][key]], prop);
    return result;
    //If string or other, use the first valid value
  } else return vals[0];
}

//Makes sure there is one sample per each specified time chunk
module.exports = function(klv, { groupTimes, timeOut, disableInterpolation, disableMerging }) {
  //Copy input
  let result = JSON.parse(JSON.stringify(klv));
  //Loop devices and streams
  for (const key in result) {
    if (result[key].streams) {
      for (const k in result[key].streams) {
        //Gather samples
        const samples = result[key].streams[k].samples;
        if (samples) {
          let remainderSample = null;
          let currentTime = 0;
          let newSamples = [];
          let reachedEnd = false;
          let i = 0;
          //Remember maximum time reached by saved samples
          let maxTimeReached = 0;
          //Loop until the end of the array
          while (!reachedEnd) {
            let group = [];
            const maxGroupTime = currentTime + groupTimes / 2;
            //Loop one time per each desired time chunk
            while (maxTimeReached < maxGroupTime) {
              //add partial sample to the start of the group if it was remaining from previous loop
              if (remainderSample) {
                group.push(remainderSample);
                remainderSample = null;
              }
              //Get how much of the sample is inside the target group to weight it
              const prevSample = samples[i - 1] || { cts: 0 };
              const nextSample = samples[i + 1] || { cts: samples[i].cts };
              const sampleStart = samples[i].cts - (samples[i].cts - prevSample.cts) / 2;
              const sampleEnd = samples[i].cts + (nextSample.cts - samples[i].cts) / 2;
              const sampleUsableStart = Math.max(sampleStart, currentTime - groupTimes / 2);
              maxTimeReached = Math.min(sampleEnd, maxGroupTime);
              //Gather all the samples within that chunk and their weights
              const weight = maxTimeReached - sampleUsableStart;
              if (weight > 0) group.push({ sample: samples[i], weight });
              //Save remainder for next group
              if (maxTimeReached !== sampleEnd) {
                const weight = sampleEnd - maxTimeReached;
                if (weight > 0) {
                  remainderSample = {
                    weight,
                    sample: samples[i]
                  };
                }
              }

              if (i + 1 >= samples.length) {
                //Until the end is reached
                reachedEnd = true;
                break;
                //Check the next sample
              } else i++;
              //One sample is just fine if disableMerging
              if (disableMerging) break;
            }

            //Decide wether to copy or interpolate (reduce with weights) samples based on the amount found under the time chunk
            if (disableInterpolation && group.length) {
              console.log('interpolation');

              newSamples.push(group[Math.floor(group.length / 2)].sample);
            } else if (group.length) {
              console.log('no interpolation');

              //get weight of first and last sample in samples array
              newSamples.push(reduceSamples(group));
            }
            //If cts was temporary, remove it
            if (timeOut === 'date' && newSamples.length) {
              delete newSamples[newSamples.length - 1].cts;
            }
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

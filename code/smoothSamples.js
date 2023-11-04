const reduceSamples = require('./utils/reduceSamples');
const breathe = require('./utils/breathe');

//Smoothens contrast between samples by averaging the specified number of them
module.exports = async function (klv, { smooth, repeatSticky }) {
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
        let newSamples = [];
        //Loop until the end of the array
        if (samples) {
          for (let i = 0; i < samples.length; i++) {
            const ins = Math.max(0, i - smooth);
            const out = Math.min(i + smooth + 1, samples.length);
            let newSample = reduceSamples(samples.slice(ins, out));
            //Preserve original times
            if (samples[i].cts != null) newSample.cts = samples[i].cts;
            if (samples[i].date != null) newSample.date = samples[i].date;
            //Preserve original sticky
            if (!repeatSticky) {
              delete newSample.sticky;
              if (samples[i].sticky) newSample.sticky = samples[i].sticky;
            }
            newSamples.push(newSample);
          }
        }
        //Replace samples with smooth ones
        result[key].streams[k].samples = newSamples;
      }
    }
  }
  return result;
};

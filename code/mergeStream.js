const { translations, ignore, stickyTranslations } = require('./keys');
const deduceHeaders = require('./deduceHeaders');

//Compare equality of values, including objects
function deepEqual(a, b) {
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) return a === b;
  if (Object.keys(a).length !== Object.keys(b).length) return false;
  for (let i = 0; i < Object.keys(a).length; i++) if (!deepEqual(a[Object.keys(a)[i]], b[Object.keys(a)[i]])) return false;
  return true;
}

//Merges all samples of every device under the same key
function mergeStreams(klv, { repeatHeaders, repeatSticky }) {
  //Will return a list of streams for a device
  let result = { streams: {} };

  //Remember stickies per device and stream, to avoid looping every time
  let stickies = {};

  (klv.DEVC || []).forEach(d => {
    //Initialise stickies per device and stream if not done yet
    stickies[d['device name']] = stickies[d['device name']] || {};
    (d.STRM || []).forEach(s => {
      //We will store the main samples of the nest. Except for STNM, which looks to be an error with the data
      if (s.interpretSamples && s.interpretSamples !== 'STNM') {
        const fourCC = s.interpretSamples;
        //Initialise stickies
        stickies[d['device name']][fourCC] = stickies[d['device name']][fourCC] || {};

        //Get the array of samples
        let samples = s[fourCC];
        //Delete the samples from the original to avoid duplication
        delete s[fourCC];
        delete s.interpretSamples;

        //Remember if will need to separate multiple samples
        const multiple = s.multi;
        delete s.multi;

        if (samples && samples.length) {
          let sticky = {};
          let description = {};
          //Loop the rest of values
          for (const key in s) {
            //Translate keys to human when necessary
            if (translations[key]) description[translations[key]] = s[key];
            //Make the rest sticky, unless we want to ignore them
            else if (!ignore.includes(key)) sticky[stickyTranslations[key] || key] = s[key];
          }
          //Remember previous sticky values, that's why they're sticky
          sticky = { ...stickies[d['device name']][fourCC], ...sticky };
          //If repeatSticky, add the sticky values to every sample
          if (repeatSticky) samples = samples.map(s => ({ ...s, ...sticky }));
          //If have both samples and stickies
          else if (Object.keys(sticky).length && samples.length) {
            for (let key in sticky) {
              //Save sticky values that have changed, discard the rest
              if (!deepEqual(sticky[key], stickies[d['device name']][fourCC][key])) {
                samples[0].sticky = samples[0].sticky || {};
                samples[0].sticky[key] = sticky[key];
              }
            }
          }
          //Remember the new sticky values
          stickies[d['device name']][fourCC] = { ...stickies[d['device name']][fourCC], ...sticky };

          //Use name and units to describe every sample
          const workOnHeaders = function(samples, desc) {
            let description = JSON.parse(JSON.stringify(desc));
            let headers = deduceHeaders(description);
            //Add the descriptions and values to samples
            samples = samples.map(s => {
              //If no available description, use numbers
              if (Array.isArray(s.value)) s.value.forEach((v, i) => (s[headers[i] || `${headers[0]} (${i})`] = v));
              else if (headers[0]) s[headers[0]] = s.value;
              //Delete value key if we solved the situation
              if (headers.length) delete s.value;
              return s;
            });
            //Delete names and units, not needed any more
            delete description.units;
            delete description.name;
            return { samples, description };
          };

          //Separate multiple samples if needed
          if (multiple) {
            //We are assuming the first value is the ID, as it happens with FACES, this might be completely wrong
            let newSamples = {};
            samples.forEach((s, i) => {
              let thisSample;
              //Loop inner samples
              (s.value || []).forEach(v => {
                //Use fake id 1 to make sure we have timing data form the get go
                let id = 1;
                if (v != null && Array.isArray(v)) id = v[0];
                //Assign first value as ID if not done
                if (!newSamples[id]) newSamples[id] = [];
                //Create sample if not done
                if (!thisSample) {
                  thisSample = {};
                  //Copy all keys except the value
                  Object.keys(s).forEach(k => {
                    if (k !== 'value') thisSample[k] = s[k];
                  });
                }
                //And copy the rest
                if (v != null && Array.isArray(v)) thisSample.value = v.slice(1);
                else thisSample.value = null;
                newSamples[id].push(thisSample);
              });
            });
            const preName = description.name;
            for (const key in newSamples) {
              description.name = preName + ' ' + key;
              let desc = description;
              if (repeatHeaders) {
                const newResults = workOnHeaders(newSamples[key], description);
                newSamples[key] = newResults.samples;
                desc = newResults.description;
              }
              //Add samples to stream entry
              if (result.streams[fourCC + key]) result.streams[fourCC + key].samples.push(...newSamples[key]);
              else result.streams[fourCC + key] = { samples: newSamples[key], ...desc };
            }
          } else {
            if (repeatHeaders) {
              const newResults = workOnHeaders(samples, description);
              samples = newResults.samples;
              description = newResults.description;
            }
            //Add samples to stream entry
            if (result.streams[fourCC]) result.streams[fourCC].samples.push(...samples);
            else result.streams[fourCC] = { samples, ...description };
          }
        }
      }
    });

    //Delete used data
    delete d.DVID;
    delete d.interpretSamples;
    delete d.STRM;

    //Translate top level keys
    for (const key in d) {
      if (translations[key]) result[translations[key]] = d[key];
      else result[key] = d[key];
    }
  });
  return result;
}

module.exports = mergeStreams;

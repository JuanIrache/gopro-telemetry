const { translations, ignore, stickyTranslations, idKeysTranslation, idValuesTranslation } = require('./keys');
const deduceHeaders = require('./deduceHeaders');
const hero7Labelling = require('./hero7Labelling');

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
          if (repeatSticky) samples = samples.map(ss => ({ ...ss, ...sticky }));
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
            samples = samples.map(ss => {
              //If no available description, use numbers
              if (Array.isArray(ss.value)) ss.value.forEach((v, i) => (ss[headers[i] || `${headers[0]} (${i})`] = v));
              else if (headers[0]) ss[headers[0]] = ss.value;
              //Delete value key if we solved the situation
              if (headers.length) delete ss.value;
              return ss;
            });
            //Delete names and units, not needed any more
            delete description.units;
            delete description.name;
            return { samples, description };
          };

          //Simplify Hero7 Labelling style
          description.name = hero7Labelling(description.name);

          //Separate multiple samples if needed
          if (multiple) {
            //We are assuming the first value is the ID, as it happens with FACES, this might be completely wrong
            let newSamples = {};
            //Dummy id key if none is found
            let idKey = 'id';
            samples.forEach(ss => {
              if (description.name) {
                //Remove ID from description if present
                const parts = description.name.match(/\((\w+),?(.*)\)$/i);
                if (parts) {
                  //Save id key for later
                  idKey = idKeysTranslation(parts[1]);
                  description.name = description.name.replace(/\((\w+),?(.*)\)$/i, `(${parts[2]}) ${idKey}:`);
                }
              }

              let thisSample;
              //Loop inner samples
              (ss.value || []).forEach(v => {
                if (v != null && Array.isArray(v)) {
                  let id = v[0];
                  //Assign first value as ID if not done
                  if (!newSamples[id]) newSamples[id] = [];
                  //Create sample if not done
                  if (!thisSample) {
                    thisSample = {};
                    //Copy all keys except the value
                    Object.keys(ss).forEach(k => {
                      if (k !== 'value') thisSample[k] = ss[k];
                    });
                  }

                  //And copy the rest
                  if (v != null && Array.isArray(v)) thisSample.value = v.slice(1);
                  else thisSample.value = v;
                  //And simplify single values
                  if (Array.isArray(thisSample.value) && thisSample.value.length === 1) thisSample.value = thisSample.value[0];
                  //Save
                  newSamples[id].push(thisSample);
                }
              });
            });
            const preName = description.name;
            for (const key in newSamples) {
              description.name = preName + ' ' + key;
              //Add id
              description[idKey] = idValuesTranslation(key, idKey);
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

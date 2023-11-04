const {
  translations,
  ignore,
  stickyTranslations,
  idKeysTranslation,
  idValuesTranslation,
  mp4ValidSamples
} = require('./data/keys');
const deduceHeaders = require('./utils/deduceHeaders');
const hero7Labelling = require('./utils/hero7Labelling');
const breathe = require('./utils/breathe');

//Compare equality of values, including objects
function deepEqual(a, b) {
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null)
    return a === b;
  if (Object.keys(a).length !== Object.keys(b).length) return false;
  for (let i = 0; i < Object.keys(a).length; i++)
    if (!deepEqual(a[Object.keys(a)[i]], b[Object.keys(a)[i]])) return false;
  return true;
}

//Merges all samples of every device under the same key
async function mergeStreams(klv, options) {
  const { repeatHeaders, repeatSticky, mp4header } = options;
  //Will return a list of streams for a device
  let result = { streams: {} };

  //Remember stickies per device and stream, to avoid looping every time
  let stickies = {};

  for (const d of klv.DEVC || []) {
    //Initialise stickies per device and stream if not done yet
    if (d != null) {
      stickies[d['device name']] = stickies[d['device name']] || {};
      try {
        for (let i = 0; i < d.STRM.length; i++) {
          await breathe();
          const s = d.STRM[i] || {};
          //We will store the main samples of the nest. Except for STNM, which looks to be an error with the data
          if (
            (!mp4header || mp4ValidSamples.includes(s.interpretSamples)) &&
            s.interpretSamples &&
            s.interpretSamples !== 'STNM'
          ) {
            const fourCC = s.interpretSamples;
            //Initialise stickies
            stickies[d['device name']][fourCC] =
              stickies[d['device name']][fourCC] || {};

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
              let description = { name: fourCC };
              //Loop the rest of values
              for (const key in s) {
                //Translate keys to human when necessary
                if (translations[key]) description[translations[key]] = s[key];
                //Make the rest sticky, unless we want to ignore them
                else if (!ignore.includes(key))
                  sticky[stickyTranslations[key] || key] = s[key];
              }
              //Remember previous sticky values, that's why they're sticky
              sticky = { ...stickies[d['device name']][fourCC], ...sticky };
              //If repeatSticky, add the sticky values to every sample
              if (repeatSticky) {
                for (let i = 0; i < samples.length; i++) {
                  samples[i] = { ...(samples[i] || {}), ...sticky };
                }
              }
              //If have both samples and stickies
              else if (Object.keys(sticky).length && samples.length) {
                for (let key in sticky) {
                  //Save sticky values that have changed, discard the rest
                  if (
                    !deepEqual(
                      sticky[key],
                      stickies[d['device name']][fourCC][key]
                    )
                  ) {
                    samples[0].sticky = samples[0].sticky || {};
                    samples[0].sticky[key] = sticky[key];
                  }
                }
              }
              //Remember the new sticky values
              stickies[d['device name']][fourCC] = {
                ...stickies[d['device name']][fourCC],
                ...sticky
              };

              //Use name and units to describe every sample
              const workOnHeaders = async function (samples, desc) {
                let description = JSON.parse(JSON.stringify(desc));
                let headers = deduceHeaders(description);
                //Add the descriptions and values to samples
                for (let i = 0; i < samples.length; i++) {
                  //If no available description, use numbers
                  const ss = samples[i] || {};
                  if (Array.isArray(ss.value)) {
                    ss.value.forEach(
                      (v, i) => (ss[headers[i] || `(${i})`] = v)
                    );
                  } else if (headers[0]) ss[headers[0]] = ss.value;
                  //Delete value key if we solved the situation
                  if (headers.length) delete ss.value;
                  samples[i] = ss;
                }
                //Delete names and units, not needed any more
                delete description.units;
                delete description.name;
                return { samples, description };
              };

              //Simplify Hero7 Labelling style
              description.name = hero7Labelling(description.name);

              //This bit saved as function for more than one condition to use it
              const completeSample = async ({ samples, description }) => {
                if (repeatHeaders) {
                  const newResults = await workOnHeaders(samples, description);
                  samples = newResults.samples;
                  description = newResults.description;
                }
                //Add samples to stream entry
                if (result.streams[fourCC])
                  result.streams[fourCC].samples.push(...samples);
                else result.streams[fourCC] = { samples, ...description };
              };

              //Separate multiple samples if needed
              if (multiple) {
                //We are assuming the first value is the ID, as it happens with FACES, this might be completely wrong
                let newSamples = {};
                //Dummy id key if none is found
                let idKey = 'id';
                let idPos = 0;
                let idParts, firstIdParts;
                if (description.name) {
                  //Remove ID from description if present
                  idParts = description.name.match(/(\(.*)\b(ID)\b,?(.*\))$/);
                  if (idParts) {
                    idPos = idParts[0]
                      .replace(/\((.*)\)$/, '$1')
                      .split(',')
                      .indexOf('ID');
                    idKey = 'ID';
                  } else {
                    firstIdParts = description.name.match(/\((\w+),?(.*)\)$/i);
                    if (firstIdParts) {
                      //Save id key for later
                      idKey = idKeysTranslation(firstIdParts[1]);
                    }
                  }
                }

                if (samples[0].value[0] && samples[0].value[0].length === 2) {
                  //keep everything in 1 stream, just label it
                  const headers = [];
                  const newSamples = [];
                  //Grab the id of each substream, save it for the description, and save the second value as the only value
                  for (let i = 0; i < samples.length; i++) {
                    const ss = samples[i] || {};
                    //Loop inner samples
                    const newSample = { ...ss, value: [] };
                    (ss.value || []).forEach((v, x) => {
                      if (v != null && Array.isArray(v)) {
                        headers[x] = idValuesTranslation(v[0], idKey);
                        newSample.value.push(v[idPos === 1 ? 0 : 1]);
                      }
                    });

                    newSamples.push(newSample);
                  }

                  if (firstIdParts || idParts) {
                    //Add previously known units to description
                    description.name = description.name.replace(
                      /\((\w+),?(.*)\)$/i,
                      ` | ${idKey}`
                    );
                    if (firstIdParts) {
                      description.units = firstIdParts[2]
                        .split(',')
                        .map(p => p.trim());
                    }
                  }
                  //Add new keys
                  description.name += ` (${headers.join(',')})`;

                  await completeSample({ samples: newSamples, description });
                } else {
                  //Split stream in substreams
                  if (idParts) {
                    description.name = description.name.replace(
                      idParts[0],
                      idParts[1] + idParts[3]
                    );
                  } else if (firstIdParts) {
                    description.name = description.name.replace(
                      /\((\w+),?(.*)\)$/i,
                      `(${firstIdParts[2]})`
                    );
                  }

                  for (let i = 0; i < samples.length; i++) {
                    const ss = samples[i] || {};
                    //Loop inner samples
                    (ss.value || []).forEach(v => {
                      if (v != null && Array.isArray(v)) {
                        let id = v[idPos];
                        //Assign first value as ID if not done
                        if (!newSamples[id]) newSamples[id] = [];

                        let thisSample = {};
                        //Copy all keys except the value
                        Object.keys(ss).forEach(k => {
                          if (k !== 'value') thisSample[k] = ss[k];
                        });

                        //And copy the rest
                        thisSample.value = [
                          ...v.slice(0, idPos),
                          ...v.slice(idPos + 1)
                        ];
                        //And simplify single values
                        if (
                          Array.isArray(thisSample.value) &&
                          thisSample.value.length === 1
                        )
                          thisSample.value = thisSample.value[0];
                        //Save
                        newSamples[id].push(thisSample);
                      }
                    });
                  }
                  for (const key in newSamples) {
                    //Add id
                    description.subStreamName = `${idKey}:${idValuesTranslation(
                      key,
                      idKey
                    )}`;
                    let desc = description;
                    if (repeatHeaders) {
                      const newResults = await workOnHeaders(
                        newSamples[key],
                        description
                      );
                      newSamples[key] = newResults.samples;
                      desc = newResults.description;
                    }
                    //Add samples to stream entry
                    if (result.streams[fourCC + key]) {
                      result.streams[fourCC + key].samples.push(
                        ...newSamples[key]
                      );
                    } else {
                      if (
                        Array.isArray(options.stream) &&
                        options.stream.includes(fourCC)
                      ) {
                        options.stream.push(fourCC + key);
                      }
                      result.streams[fourCC + key] = {
                        samples: newSamples[key],
                        ...desc
                      };
                    }
                  }
                }
              } else await completeSample({ samples, description });
            }
            //If this not a normal stream with samples, just copy the data
          } else {
            if (s.interpretSamples) delete s.interpretSamples;
            result.streams[`Data ${i}`] = JSON.parse(JSON.stringify(d.STRM));
          }
        }
      } catch (error) {}
    }

    //Delete used data
    delete d.DVID;
    delete d.interpretSamples;
    delete d.STRM;

    //Translate top level keys
    for (const key in d) {
      if (translations[key]) result[translations[key]] = d[key];
      else result[key] = d[key];
    }
  }
  return result;
}

module.exports = mergeStreams;

const { keyAndStructParser, types, mergeStrings } = require('./keys');
const parseV = require('./parseV');
const { generateStructArr } = require('./keys');

//quick function to find the last, most relevant fourCC key
function findLastCC(data, start, end) {
  let ks;
  while (start < end) {
    //Retrieve structured data
    ks = keyAndStructParser.parse(data.slice(start)).result;
    //But don't process it, go to next
    const length = ks.size * ks.repeat;
    const reached = start + 8 + (length >= 0 ? length : 0);
    //Align to 32 bits
    while (start < reached) start += 4;
  }
  return ks.fourCC;
}

//is it better to slice the data when recursing? Or just pass indices? we have to slice anyway when parsing
function parseKLV(data, options = {}, start = 0, end = data.length, parent) {
  let result = {};
  //Will store unknown types
  let unknown = new Set();
  //Will store complex type definitions
  let complexType = [];
  //Find the last, most relevant key
  let lastCC = findLastCC(data, start, end);
  //Remember last key for interpreting data later
  result.interpretSamples = lastCC;

  //Check if the lastCC is to be filtered out by options, but keep GPS5 for timing if not raw or lists
  if (
    parent === 'STRM' &&
    options.stream &&
    !options.stream.includes(lastCC) &&
    (lastCC != 'GPS5' || options.raw || options.streamList || options.deviceList)
  )
    return undefined;

  while (start < end) {
    let length;
    try {
      //Parse the first 2 sections (64 bits) of each KLV to decide what to do with the third
      const ks = keyAndStructParser.parse(data.slice(start)).result;

      //Get the length of the value (or values, or nested values)
      length = ks.size * ks.repeat;

      //Abort if we are creating a device list. Or a streamList and We have enough info
      const done = (options.deviceList && ks.fourCC === 'STRM') || (options.streamList && ks.fourCC === lastCC && parent === 'STRM');
      if (!done) {
        let partialResult = [];
        if (length >= 0) {
          //If empty, we still want to store the fourCC
          if (length === 0) partialResult.push(undefined);
          //Log unknown types for future implementation
          else if (!types[ks.type]) unknown.add(ks.type);
          //Recursive call to parse nested data
          else if (types[ks.type].nested) {
            const parsed = parseKLV(data, options, start + 8, start + 8 + length, ks.fourCC);
            if (parsed != null) partialResult.push(parsed);
          }
          //We can parse the Value
          else if (types[ks.type].func || (types[ks.type].complex && complexType)) {
            //Detect data with multiple axes
            let axes = 1;
            if (types[ks.type].size > 1) axes = ks.size / types[ks.type].size;
            //Detect them when the type is complex
            else if (types[ks.type].complex && complexType.length) axes = complexType.length;
            //Human readable strings should de merged for readability
            if (mergeStrings.includes(ks.fourCC)) {
              ks.size = length;
              ks.repeat = 1;
            }

            const environment = { data, options, ks };
            const specifics = { ax: axes, complexType };

            //Access the values or single value
            if (ks.repeat > 1) {
              for (let i = 0; i < ks.repeat; i++) partialResult.push(parseV(environment, start + 8 + i * ks.size, ks.size, specifics));
            } else partialResult.push(parseV(environment, start + 8, length, specifics));
            //If we just read a TYPE value, store it. Will be necessary in this nest
            if (ks.fourCC === 'TYPE') complexType = partialResult[0];
            //Abort if we are selecting devices and this one is not selected
            else if (ks.fourCC === 'DVID' && parent === 'DEVC' && options.device && !options.device.includes(partialResult[0]))
              return undefined;

            //Something went wrong, store type for debugging
          } else unknown.add(ks.type);

          //Try to define unknown data based on documentation
          if (!options.raw && ks.fourCC === lastCC && generateStructArr(ks.fourCC)) {
            //Create the string for inside the parenthesis, and remove nulls
            let extraDescription = generateStructArr(ks.fourCC).filter(v => v != null);
            let newValueArr = [];
            //Loop partial results
            partialResult.forEach((p, i) => {
              //Will become the description if it's the most comprehensive one
              let descCandidate = [];
              let newP = [];
              //Loop the keys in the description
              generateStructArr(ks.fourCC).forEach((e, ii) => {
                //For nested arrays
                if (Array.isArray(p) && e != null) {
                  //Push label and value if not null (in order to get rid of unused data)
                  descCandidate.push(e);
                  newP.push(p[ii]);
                  //And for values, push first label
                } else if (ii === 0 && e != null) descCandidate.push(e);
              });
              //Save new values if worth it
              if (newP.length) partialResult[i] = newP;
              if (descCandidate.length > extraDescription.length) extraDescription = descCandidate;
            });

            if (newValueArr.length) partialResult[0] = newValueArr;
            if (extraDescription.length) {
              const extraDescString = extraDescription.join(',');
              if (!/\(.+\)$/.test(result.STNM)) {
                result.STNM = `${result.STNM || ''} (${extraDescString})`;
              } else if (result.STNM.match(/\((.+)\)$/)[1].length < extraDescString.length) {
                result.STNM.replace(/\(.+\)$/, `(${extraDescString})`);
              }
            }
          }

          //Handle data with multiple samples. Not easy
          if (result.hasOwnProperty(ks.fourCC)) {
            if (parent === 'STRM') {
              if (!result.multi) result[ks.fourCC] = [result[ks.fourCC]];
              result[ks.fourCC].push(partialResult);
              result.multi = true;
            } else result[ks.fourCC] = result[ks.fourCC].concat(partialResult);
          } else result[ks.fourCC] = partialResult;

          //Parsing error
        } else throw new Error('Error, negative length');
      }
    } catch (err) {
      if (options.tolerant) setImmediate(() => console.error(err));
      else throw err;
    }

    //Advance to the next KLV, at least 64 bits
    const reached = start + 8 + (length >= 0 ? length : 0);
    //Align to 32 bits
    while (start < reached) start += 4;
  }

  //Undo all arrays except the last key, which should be the array of samples
  for (const key in result) if (key !== lastCC && result[key].length === 1) result[key] = result[key][0];

  //If debugging, print unexpected types
  if (options.debug && unknown.size) setImmediate(() => console.log('unknown types:', [...unknown].join(',')));

  //Remove multi if data is for direct delivery
  if (options.raw) delete result.multi;

  return result;
}

module.exports = parseKLV;

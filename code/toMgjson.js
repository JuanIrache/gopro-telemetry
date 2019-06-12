//Export to Adobe After Effect's mgJSON format. It's poorly documented, but here's a minimal working example: https://github.com/JuanIrache/mgjson

const deduceHeaders = require('./deduceHeaders');
const padStringNumber = require('./padStringNumber');
const bigStr = require('./bigStr');

//After Effects can't read larger numbers
const largestMGJSONNum = 2147483648;

//Build the style that After Effects needs for static text
function createDataOutlineChildText(matchName, displayName, value) {
  if (typeof value != 'string') value = value.toString();
  return {
    objectType: 'dataStatic',
    displayName,
    dataType: {
      type: 'string',
      paddedStringProperties: {
        maxLen: value.length,
        maxDigitsInStrLength: value.length.toString().length,
        eventMarkerB: false
      }
    },
    matchName,
    value
  };
}

//Build the style that After Effects needs for dynamic values: numbers, arrays of numbers (axes) or strings (date)
function createDynamicDataOutline(matchName, displayName, units, sample, { inn, out } = {}, part) {
  const type = getDataOutlineType(sample);
  let result = {
    objectType: 'dataDynamic',
    displayName,
    sampleSetID: matchName,
    dataType: { type },
    //We apply (linear) interpolation to numeric values only
    interpolation: type === 'paddedString' ? 'hold' : 'linear',
    hasExpectedFrequencyB: false,
    //Some values will be set afterwards
    sampleCount: null,
    matchName
  };

  if (type === 'numberString') {
    //Number saved as string (After Effects reasons)
    if (units) result.displayName += ` [${units}]`;
    result.dataType.numberStringProperties = {
      pattern: {
        //Will be calculated later
        digitsInteger: 0,
        digitsDecimal: 0,
        //Will use plus and minus signs always. Seems easier
        isSigned: true
      },
      range: {
        //We use the allowed extremes, will compare to actual data
        occuring: { min: largestMGJSONNum, max: -largestMGJSONNum },
        //Legal values could potentially be modified per stream type (for example, latitude within -+85, longitude -+180... but what's the benefit?)
        legal: { min: -largestMGJSONNum, max: largestMGJSONNum }
      }
    };
  } else if (type === 'numberStringArray') {
    //Try to create a different display name, either by using the repeatheaders technique or specifying the part
    const partialName = deduceHeaders({ name: displayName, units }, { inn, out });
    if (partialName != result.displayName) result.displayName = partialName;
    else if (part) result.displayName += ` part ${part + 1}`;
    //Array of numbers, for example axes of a sensor
    let deducedHeaders = deduceHeaders({ name: displayName, units });
    let selectedHeaders = deducedHeaders.slice(inn, out);
    if (selectedHeaders.length != sample.length) selectedHeaders = sample.map(s => deducedHeaders[0]);
    result.dataType.numberArrayProperties = {
      pattern: {
        isSigned: true,
        digitsInteger: 0,
        digitsDecimal: 0
      },
      //Limited to 3 axes, we split the rest to additional streams
      arraySize: sample.slice(inn, out).length,
      //Set tentative headers for each array. much like the repeatHeaders option
      arrayDisplayNames: deducedHeaders,
      arrayRanges: {
        ranges: sample
          .map(s => ({
            occuring: { min: largestMGJSONNum, max: -largestMGJSONNum },
            legal: { min: -largestMGJSONNum, max: largestMGJSONNum }
          }))
          .slice(inn, out)
      }
    };
  } else if (type === 'paddedString') {
    //Any other value is expressed as string
    if (units) result.displayName += `[${units}]`;
    result.dataType.paddedStringProperties = {
      maxLen: 0,
      maxDigitsInStrLength: 0,
      eventMarkerB: false
    };
  }

  return result;
}

//Deduce the kind of structure we need, from the data
function getDataOutlineType(value) {
  if (typeof value === 'number') return 'numberString';
  else if (Array.isArray(value) && value.length && typeof value[0] === 'number') return 'numberStringArray';
  else return 'paddedString';
}

//Returns the GPS data as parts of an mgjson object
function getGPGS5Data(data) {
  //Will hold the description of each stream
  let dataOutline = [];
  //Holds the streams
  let dataDynamicSamples = [];
  //Have we created the date stream?
  let dateStream = false;
  for (const key in data) {
    if (data[key].streams) {
      //Save a static entry with the device name
      let device = key;
      if (data[key]['device name'] != null) device = data[key]['device name'];
      dataOutline.push(createDataOutlineChildText(`DEVC${key}`, 'Device name', device));

      for (const stream in data[key].streams) {
        //We try to save all valid streams
        if (data[key].streams[stream].samples && data[key].streams[stream].samples.length) {
          //Save the stream name for display
          let streamName = stream;
          if (data[key].streams[stream].name != null) streamName = data[key].streams[stream].name;
          let units;
          if (data[key].streams[stream].units != null) units = data[key].streams[stream].units;

          const getValidValue = function(arr, key) {
            for (const s of arr) if (s[key] != null) return s[key];
          };

          //Find a valid value to base the data structure on
          let validSample = getValidValue(data[key].streams[stream].samples, 'value');

          //Prepare iteration in case we need to loop over samples more than 3 items long
          let inout;
          if (Array.isArray(validSample)) inout = { inn: 0, out: 3, total: validSample.length };

          //Force format in FACE keys
          if (/^FACE\d*$/.test(stream)) inout = { inn: 0, out: 2, total: validSample.length };

          //Loop until all values are sorted. In most cases just once, decide break at the end
          for (;;) {
            //Prepare sample set
            const part = inout ? inout.inn / (inout.out - inout.inn) : 0;
            const sampleSetID = `stream${key + 'X' + stream + 'X' + (part ? part + 1 : '')}`;
            let sampleSet = {
              sampleSetID,
              samples: []
            };

            //Create the stream structure
            let dataOutlineChild = createDynamicDataOutline(sampleSetID, streamName, units, validSample, inout, part);
            //And find the type
            const type = getDataOutlineType(validSample);

            //Prepare stream of dates, basically repeat the previous procedure
            let forDateStream;
            if (!dateStream) {
              let dateSample = getValidValue(data[key].streams[stream].samples, 'date');

              //Make sure it is an object date and not a string. There must me some problem in another module changing this
              if (typeof dateSample != 'object') dateSample = new Date(dateSample);

              forDateStream = {
                sampleSet: {
                  sampleSetID: 'streamXdate',
                  samples: []
                },
                outline: createDynamicDataOutline(`streamXdate`, 'UTC date/time', null, dateSample.toISOString())
              };
            }

            const setMaxMinPadStr = function(val, outline) {
              //Set found max lengths
              outline.dataType.paddedStringProperties.maxLen = Math.max(
                val.toString().length,
                outline.dataType.paddedStringProperties.maxLen
              );
              outline.dataType.paddedStringProperties.maxDigitsInStrLength = Math.max(
                val.length.toString().length,
                outline.dataType.paddedStringProperties.maxDigitsInStrLength
              );
            };

            //Loop all the samples
            data[key].streams[stream].samples.forEach(s => {
              //Save date samples if not done
              if (s.date && !dateStream) {
                if (typeof s.date != 'object') s.date = new Date(s.date);
                //Save the dates as UTC string
                s.date = s.date.toISOString();
                let dateSample = { time: s.date, value: { length: s.date.length.toString(), str: s.date } };
                setMaxMinPadStr(s.date, forDateStream.outline);
                //Save sample
                forDateStream.sampleSet.samples.push(dateSample);
              }

              const setMaxMinPadNum = function(val, pattern, range) {
                //Update mins and maxes
                range.occuring.min = Math.min(val, range.occuring.min);
                range.occuring.max = Math.max(val, range.occuring.max);
                //And max left and right padding
                pattern.digitsInteger = Math.max(bigStr(Math.floor(val)).length, pattern.digitsInteger);
                pattern.digitsDecimal = Math.max(bigStr(val).replace(/^\d*\.?/, '').length, pattern.digitsDecimal);
              };

              //Back to data samples. Check that at least we have the valid values
              if (s.value != null) {
                let sample = { time: s.date };
                if (type === 'numberString') {
                  //Save numbers as strings
                  sample.value = bigStr(s.value);
                  //Update mins, maxes and padding
                  setMaxMinPadNum(
                    s.value,
                    dataOutlineChild.dataType.numberStringProperties.pattern,
                    dataOutlineChild.dataType.numberStringProperties.range
                  );
                } else if (type === 'numberStringArray') {
                  //Save arrays of numbers as arrays of strings
                  sample.value = [];
                  s.value.slice(inout.inn, inout.out).forEach((v, i) => {
                    sample.value[i] = bigStr(v);
                    //And update, mins, maxs and paddings
                    setMaxMinPadNum(
                      v,
                      dataOutlineChild.dataType.numberArrayProperties.pattern,
                      dataOutlineChild.dataType.numberArrayProperties.arrayRanges.ranges[i]
                    );
                  });
                } else if (type === 'paddedString') {
                  //Save anything else as (padded)string
                  sample.value = { length: s.value.length.toString(), str: s.value };
                  setMaxMinPadStr(s.value, dataOutlineChild);
                }
                //Save sample
                sampleSet.samples.push(sample);
              }
            });

            //Finish date stream
            if (!dateStream) {
              forDateStream.sampleSet.samples.forEach(s => {
                //Apply maximum padding
                s.value.str = s.value.str.padEnd(forDateStream.outline.dataType.paddedStringProperties.maxLen, ' ');
                s.value.length = s.value.length.padStart(forDateStream.outline.dataType.paddedStringProperties.maxDigitsInStrLength, '0');
              });
              //Record total length of samples
              forDateStream.outline.sampleCount = forDateStream.sampleSet.samples.length;
              //Add to data
              dataOutline.push(forDateStream.outline);
              dataDynamicSamples.push(forDateStream.sampleSet);
              //Done with date
              dateStream = true;
            }

            sampleSet.samples.forEach(s => {
              if (type === 'numberString') {
                //Apply max padding to every sample
                s.value = padStringNumber(
                  s.value,
                  dataOutlineChild.dataType.numberStringProperties.pattern.digitsInteger,
                  dataOutlineChild.dataType.numberStringProperties.pattern.digitsDecimal
                );
              } else if (type === 'numberStringArray') {
                //Apply max padding to every sample
                s.value = s.value.map(v =>
                  padStringNumber(
                    v,
                    dataOutlineChild.dataType.numberArrayProperties.pattern.digitsInteger,
                    dataOutlineChild.dataType.numberArrayProperties.pattern.digitsDecimal
                  )
                );
              } else if (type === 'paddedString') {
                //Apply max padding to every sample           
                s.value.str = s.value.str.padEnd(dataOutlineChild.dataType.paddedStringProperties.maxLen, ' ');
                s.value.length = s.value.length.padStart(dataOutlineChild.dataType.paddedStringProperties.maxDigitsInStrLength, '0');
              }
            });
            //Save total samples count
            dataOutlineChild.sampleCount = sampleSet.samples.length;
            //Save stream
            dataOutline.push(dataOutlineChild);
            dataDynamicSamples.push(sampleSet);

            //Check if we reached the end or have to loop more fields in array value
            if (inout) {
              if (inout.out >= inout.total) break;
              const diff = inout.out - inout.inn;
              inout.inn = inout.out;
              inout.out += diff;
              //Force skip empty values in FACE keys and go to smile. VERY HACKY
              if (inout.inn === 6 && /^FACE\d*$/.test(stream) && inout.total > 21) {
                inout.inn = 21;
                inout.out = 22;
              }
            } else break;
          }
        }
      }
    }
  }
  return { dataOutline, dataDynamicSamples };
}

//Converts the processed data to After Effects format
module.exports = function(data, { name = '' }) {
  if (data['frames/second'] == null) throw new Error('After Effects needs frameRate');
  const converted = getGPGS5Data(data);
  //The format is very convoluted. This is the outer structure
  let result = {
    version: 'MGJSON2.0.0',
    creator: 'https://github.com/JuanIrache/gopro-telemetry',
    dynamicSamplesPresentB: true,
    dynamicDataInfo: {
      useTimecodeB: false,
      utcInfo: {
        precisionLength: 3,
        isGMT: true
      }
    },
    //Create first data point with filename
    dataOutline: [createDataOutlineChildText('filename', 'File name', name), ...converted.dataOutline],
    //And paste the converted data
    dataDynamicSamples: converted.dataDynamicSamples
  };

  //Remove dynamic data if no samples
  if (!result.dataDynamicSamples.length) {
    delete result.dataDynamicSamples;
    delete result.dynamicDataInfo;
    result.dynamicSamplesPresentB = false;
  }

  return result;
};

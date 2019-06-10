//Export to Adobe After Effect's mgJSON format. It's poorly documented, but here's a minimal working example: https://github.com/JuanIrache/mgjson

const deduceHeaders = require('./deduceHeaders');
const padStringNumber = require('./padStringNumber');

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
function createDynamicDataOutline(matchName, displayName, units, sample) {
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
    if (units) result.displayName += `[${units}]`;
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
    //Array of numbers, for example axes of a sensor
    result.dataType.numberArrayProperties = {
      pattern: {
        isSigned: true,
        digitsInteger: 0,
        digitsDecimal: 0
      },
      //Limited to 3 axes, we split the rest to additional streams
      arraySize: sample.slice(0, 3).length,
      //aqui dynamically pick slice when splitting samples
      //Set tentative headers for each array. much like the repeatHeaders option
      arrayDisplayNames: deduceHeaders({ name: displayName, units }).slice(0, 3),
      arrayRanges: {
        ranges: sample
          .map(s => ({
            occuring: { min: largestMGJSONNum, max: -largestMGJSONNum },
            legal: { min: -largestMGJSONNum, max: largestMGJSONNum }
          }))
          .slice(0, 3) //aqui fix when multiple sets
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

          //Prepare sample set
          let sampleSet = {
            sampleSetID: `stream${key + stream}`,
            samples: []
          };

          let validSample;
          //Find a valid value to base the data structure on
          for (const s of data[key].streams[stream].samples) {
            if (s.value != null) {
              validSample = s.value;
              break;
            }
          }

          //Create the stream structure
          let dataOutlineChild = createDynamicDataOutline(`stream${key + stream}`, streamName, units, validSample);
          //And find the type
          const type = getDataOutlineType(validSample);

          //Prepare stream of dates, basically repeat the previous procedure
          let forDateStream;
          if (!dateStream) {
            let dateSample;
            for (const s of data[key].streams[stream].samples) {
              if (s.date != null) {
                dateSample = s.date;
                break;
              }
            }
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

          //Loop all the samples
          data[key].streams[stream].samples.forEach((s, i) => {
            //Save date samples if not done
            if (s.date && !dateStream) {
              if (typeof s.date != 'object') s.date = new Date(s.date);
              //Save the dates as UTC string
              s.date = s.date.toISOString();
              let dateSample = {
                time: s.date,
                value: { length: s.date.length.toString(), str: s.date }
              };

              //Set found max lengths
              forDateStream.outline.dataType.paddedStringProperties.maxLen = Math.max(
                s.date.toString().length,
                forDateStream.outline.dataType.paddedStringProperties.maxLen
              );
              forDateStream.outline.dataType.paddedStringProperties.maxDigitsInStrLength = Math.max(
                s.date.length.toString().length,
                forDateStream.outline.dataType.paddedStringProperties.maxDigitsInStrLength
              );
              //Save sample
              forDateStream.sampleSet.samples.push(dateSample);
            }

            //Back to data samples. Check that at least we have the valid values
            if (s.value != null) {
              let sample = { time: s.date };
              if (type === 'numberString') {
                //Save numbers as strings
                sample.value = s.value.toString();
                //Update mins and maxes
                dataOutlineChild.dataType.numberStringProperties.range.occuring.min = Math.min(
                  s.value,
                  dataOutlineChild.dataType.numberStringProperties.range.occuring.min
                );
                dataOutlineChild.dataType.numberStringProperties.range.occuring.max = Math.max(
                  s.value,
                  dataOutlineChild.dataType.numberStringProperties.range.occuring.max
                );
                //And max left and right padding
                dataOutlineChild.dataType.numberStringProperties.pattern.digitsInteger = Math.max(
                  Math.floor(s.value).toString().length,
                  dataOutlineChild.dataType.numberStringProperties.pattern.digitsInteger
                );
                dataOutlineChild.dataType.numberStringProperties.pattern.digitsDecimal = Math.max(
                  s.value.toString().replace(/^\d*\.?/, '').length,
                  dataOutlineChild.dataType.numberStringProperties.pattern.digitsDecimal
                );
              } else if (type === 'numberStringArray') {
                //Save arrays of numbers as arrays of strings
                sample.value = [];
                s.value.forEach((v, i) => {
                  //fix when splitting to multiple sets
                  if (i < 3) {
                    sample.value[i] = v.toString();
                    //And update, mins, maxs and paddings
                    dataOutlineChild.dataType.numberArrayProperties.arrayRanges.ranges[i].occuring.min = Math.min(
                      v,
                      dataOutlineChild.dataType.numberArrayProperties.arrayRanges.ranges[i].occuring.min
                    );
                    dataOutlineChild.dataType.numberArrayProperties.arrayRanges.ranges[i].occuring.max = Math.max(
                      v,
                      dataOutlineChild.dataType.numberArrayProperties.arrayRanges.ranges[i].occuring.max
                    );

                    dataOutlineChild.dataType.numberArrayProperties.pattern.digitsInteger = Math.max(
                      Math.floor(v).toString().length,
                      dataOutlineChild.dataType.numberArrayProperties.pattern.digitsInteger
                    );
                    dataOutlineChild.dataType.numberArrayProperties.pattern.digitsDecimal = Math.max(
                      v.toString().replace(/^\d*\.?/, '').length,
                      dataOutlineChild.dataType.numberArrayProperties.pattern.digitsDecimal
                    );
                  }
                });
              } else if (type === 'paddedString') {
                //Save anything else as (padded)string
                sample.value = {
                  length: s.value.toString().length.toString(),
                  str: s.value.toString()
                };
                //Update max length for padding
                dataOutlineChild.dataType.paddedStringProperties.maxLen = Math.max(
                  s.value.toString().length,
                  dataOutlineChild.dataType.paddedStringProperties.maxLen
                );
                dataOutlineChild.dataType.paddedStringProperties.maxDigitsInStrLength = Math.max(
                  s.value.toString().length.toString().length,
                  dataOutlineChild.dataType.paddedStringProperties.maxDigitsInStrLength
                );
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

  return result;
};

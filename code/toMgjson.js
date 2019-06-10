const deduceHeaders = require('./deduceHeaders');

//After Effects can't read larger numbers
const largestMGJSONNum = 2147483648;

function createDataOutlineChildText(matchName, displayName, value) {
  //Build the style that After Effects needs
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

function createDynamicDataOutline(matchName, displayName, units, sample) {
  const type = getDataOutlineType(sample);
  let result = {
    objectType: 'dataDynamic',
    displayName,
    sampleSetID: matchName,
    dataType: { type },
    interpolation: type === 'paddedString' ? 'hold' : 'linear',
    hasExpectedFrequencyB: false,
    sampleCount: null,
    matchName
  };

  if (type === 'numberString') {
    if (units) result.displayName += `[${units}]`;
    result.dataType.numberStringProperties = {
      pattern: {
        digitsInteger: 0,
        digitsDecimal: 0,
        isSigned: true
      },
      range: {
        occuring: { min: largestMGJSONNum, max: -largestMGJSONNum },
        legal: { min: -largestMGJSONNum, max: largestMGJSONNum }
      }
    };
  } else if (type === 'numberStringArray') {
    result.dataType.numberArrayProperties = {
      pattern: {
        isSigned: true,
        digitsInteger: 0,
        digitsDecimal: 0
      },
      arraySize: sample.length,
      //aqui dynamically pick slice when splitting samples
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
    result.dataType.paddedStringProperties = {
      maxLen: null,
      maxDigitsInStrLength: null,
      eventMarkerB: false
    };
  }

  return result;
}

function getDataOutlineType(value) {
  if (typeof value === 'number') return 'numberString';
  else if (Array.isArray(value) && value.length && typeof value[0] === 'number') return 'numberStringArray';
  else return 'paddedString';
}

//Turn frame number into timecode
//https://stackoverflow.com/a/31094859
function createTimecode(currentFrame, fps) {
  fps = Math.round(fps);
  const h = Math.floor(currentFrame / (60 * 60 * fps));
  const m = Math.floor(currentFrame / (60 * fps)) % 60;
  const s = Math.floor(currentFrame / fps) % 60;
  const f = currentFrame % fps;
  return `${showTwoDigits(h)}:${showTwoDigits(m)}:${showTwoDigits(s)}:${showTwoDigits(f)}`;
}

function showTwoDigits(number) {
  return ('00' + number).slice(-2);
}

function padNumber(val, int, dec) {
  let sign = '+';
  if (val[0] === '-') {
    sign = '-';
    val = val.slice(1);
  }

  let integer = val.match(/^(\d*)/);
  if (int) {
    if (!integer || !integer.length) integer = ['0', '0'];
    let padded = integer[1].padStart(int, '0');
    val = val.replace(/^(\d*)/, padded);
  }
  let decimal = val.match(/\.(\d*)$/);
  if (dec) {
    const missingDot = !decimal || !decimal.length;
    if (missingDot) decimal = ['0', '0'];
    let padded = decimal[1].padEnd(dec, '0');
    if (missingDot) val = `${val}.${padded}`;
    else val = val.replace(/(\d*)$/, padded);
  }
  return sign + val;
}

//Returns the GPS data as a mgjson partial object
function getGPGS5Data(data) {
  let dataOutline = [];
  let dataDynamicSamples = [];
  for (const key in data) {
    if (data[key].streams) {
      //Save an entry with the device name
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
          let dataOutlineChild = createDynamicDataOutline(
            `stream${key + stream}`,
            streamName,
            units,
            data[key].streams[stream].samples[0].value
          );
          const type = getDataOutlineType(data[key].streams[stream].samples[0].value);
          //Loop all the samples
          data[key].streams[stream].samples.forEach((s, i) => {
            //Check that at least we have the valid values
            if (s.value != null) {
              let sample = { time: createTimecode(i, data['frames/second']) };
              if (type === 'numberString') {
                sample.value = s.value.toString();
                dataOutlineChild.dataType.numberStringProperties.range.occuring.min = Math.min(
                  s.value,
                  dataOutlineChild.dataType.numberStringProperties.range.occuring.min
                );
                dataOutlineChild.dataType.numberStringProperties.range.occuring.max = Math.max(
                  s.value,
                  dataOutlineChild.dataType.numberStringProperties.range.occuring.max
                );
                dataOutlineChild.dataType.numberStringProperties.pattern.digitsInteger = Math.max(
                  Math.floor(s.value).toString().length,
                  dataOutlineChild.dataType.numberStringProperties.pattern.digitsInteger
                );
                dataOutlineChild.dataType.numberStringProperties.pattern.digitsDecimal = Math.max(
                  s.value.toString().replace(/^\d*\.?/, '').length,
                  dataOutlineChild.dataType.numberStringProperties.pattern.digitsDecimal
                );
              } else if (type === 'numberStringArray') {
                sample.value = [];
                s.value.forEach((v, i) => {
                  //fix when splitting to multiple sets
                  if (i < 3) {
                    sample.value[i] = v.toString();
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
                sample.value = {
                  length: s.value.toString().length.toString(),
                  str: s.value.toString()
                };
                dataOutlineChild.dataType.paddedStringProperties.maxLen = Math.max(
                  s.value.toString().length,
                  dataOutlineChild.dataType.paddedStringProperties.maxLen
                );
                dataOutlineChild.dataType.paddedStringProperties.maxDigitsInStrLength = Math.max(
                  s.value.toString().length.toString().length,
                  dataOutlineChild.dataType.paddedStringProperties.maxDigitsInStrLength
                );
              }
              sampleSet.samples.push(sample);
            }
          });
          sampleSet.samples.forEach(s => {
            if (type === 'numberString') {
              s.value = padNumber(
                s.value,
                dataOutlineChild.dataType.numberStringProperties.pattern.digitsInteger,
                dataOutlineChild.dataType.numberStringProperties.pattern.digitsDecimal
              );
            } else if (type === 'numberStringArray') {
              s.value = s.value.map(v =>
                padNumber(
                  v,
                  dataOutlineChild.dataType.numberArrayProperties.pattern.digitsInteger,
                  dataOutlineChild.dataType.numberArrayProperties.pattern.digitsDecimal
                )
              );
            } else if (type === 'paddedString') {
              s.value.str = s.value.str.padEnd(dataOutlineChild.dataType.paddedStringProperties.maxLen, ' ');
              s.value.length = s.value.length.padStart(dataOutlineChild.dataType.paddedStringProperties.maxDigitsInStrLength, '0');
            }
          });
          dataOutlineChild.sampleCount = sampleSet.samples.length;
          dataOutline.push(dataOutlineChild);
          dataDynamicSamples.push(sampleSet);
        }
      }
    }
  }
  return { dataOutline, dataDynamicSamples };
}

//Converts the processed data to After Effects pastable format
module.exports = function(data, { name = '' }) {
  if (data['frames/second'] == null) throw new Error('After Effects needs frameRate');
  const converted = getGPGS5Data(data);
  let timecodeInfo = {
    dropFrame: false,
    frameRate: { value: Math.round(data['frames/second']), scale: 1 }
  };
  //ToDo drop frame not working for some reason
  // if (data['frames/second'] > 29.96 && data['frames/second'] < 29.98) {
  //   timecodeInfo = {
  //     dropFrame: true,
  //     frameRate: { value: 29.97, scale: 1 }
  //   };
  // } else if (data['frames/second'] > 59.93 && data['frames/second'] < 59.95) {
  //   timecodeInfo = {
  //     dropFrame: true,
  //     frameRate: { value: 59.94, scale: 1 }
  //   };
  // }
  let result = {
    version: 'MGJSON2.0.0',
    creator: 'https://github.com/JuanIrache/gopro-telemetry',
    dynamicSamplesPresentB: true,
    dynamicDataInfo: {
      useTimecodeB: true,
      timecodeInfo
    },
    dataOutline: [createDataOutlineChildText('filename', 'File name', name), ...converted.dataOutline],
    dataDynamicSamples: converted.dataDynamicSamples
  };
  return result;
};

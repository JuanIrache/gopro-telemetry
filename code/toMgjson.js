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

function createDynamicDataOutline(matchName, displayName, sample) {
  const type = getDataOutlineType(value);
  let result = {
    objectType: 'dataDynamic',
    displayName,
    sampleSetID: matchName,
    dataType: { type },
    interpolation: 'linear',
    hasExpectedFrequencyB: false,
    sampleCount: null,
    matchName
  };

  if (type === 'numberString') {
    result.dataType[numberStringProperties] = {
      pattern: {
        digitsInteger: null,
        digitsDecimal: null,
        isSigned: false
      },
      range: {
        occuring: { min: null, max: null },
        legal: { min: -Infinity, max: Infinity }
      }
    };
  } else if (type === 'numberStringArray') {
  } else if (type === 'paddedString') {
  }

  return result;
}

function getDataOutlineType(value) {
  if (typeof value === 'number') return 'numberString';
  else if (Array.isArray(value) && value.length && typeof value[0] === 'number') return 'numberStringArray';
  else return 'paddedString';
}

//Returns the GPS data as a mgjson partial object
function getGPGS5Data(data) {
  let dataOutline = [];
  let dataDynamicSamples = [];
  for (const key in data) {
    //Save an entry with the device name
    let device = key;
    if (data[key]['device name'] != null) device = data[key]['device name'];
    dataOutline.push(createDataOutlineChildText(`DEVC${key}`, 'Device name', device));

    if (data[key].streams) {
      for (const stream in data[key].streams) {
        //We try to save all valid streams
        if (data[key].streams[stream].samples && data[key].streams[stream].samples.length) {
          //Save the stream name for display
          let streamName = stream;
          if (data[key].streams[stream].name != null) streamName = data[key].streams[stream].name;
          if (data[key].streams[stream].units != null) streamName += `[${data[key].streams[stream].units.toString()}]`;
          //Prepare sample set
          let sampleSet = {
            sampleSetID: `stream${key + stream}`,
            samples: []
          };
          let dataOutlineChild = createDynamicDataOutline(`stream${key + stream}`, streamName, data[key].streams[stream].samples[0]);
          //Loop all the samples
          data[key].streams[stream].samples.forEach((s, i) => {
            //Check that at least we have the valid values
            if (s.value != null) {
              let sample = { time: createTimecode(data['frames/second'], i) };
              if (getDataOutlineType(s.value) === 'numberString') {
                sample.value = s.value.toString;
                dataOutlineChild.dataType.range.occuring.min = Math.min(s.value, dataOutlineChild.dataType.range.occuring.min);
                dataOutlineChild.dataType.range.occuring.max = Math.max(s.value, dataOutlineChild.dataType.range.occuring.max);
                dataOutlineChild.dataType.pattern.digitsInteger = Math.max(
                  s.value.floor.toString().length,
                  dataOutlineChild.dataType.pattern.digitsInteger
                );
                dataOutlineChild.dataType.pattern.digitsDecimal = Math.max(
                  s.value.toString.replace(/^\d*\.?/, '').length,
                  dataOutlineChild.dataType.pattern.digitsDecimal
                );
              } else if (type === 'numberStringArray') {
              } else if (type === 'paddedString') {
              }
              sampleSet.samples.push(sample);
            }
          });
          dataOutline.sampleCount = sampleSet.length;
          dataOutline.push(dataOutlineChild);
          dataDynamicSamples.push(sampleSet);
        }
      }
    }
  }
  return { dataOutline, dataDynamicSamples };
}

//Converts the processed data to After Effects pastable format
module.exports = function(data, { name }) {
  if (data['frames/second'] == null) throw new Error('After Effects needs frameRate');
  const converted = getGPGS5Data(data);
  let result = {
    version: 'MGJSON2.0.0',
    creator: 'https://github.com/JuanIrache/gopro-telemetry',
    dynamicSamplesPresentB: true,
    dynamicDataInfo: {
      useTimecodeB: true,
      timecodeInfo: {
        dropFrame: true,
        frameRate: { value: data['frames/second'] != null, scale: 1 }
      }
    },
    dataOutline: [createDataOutlineChildText('filename', 'File name', name)],
    dataDynamicSamples: []
  };
  return result;
};

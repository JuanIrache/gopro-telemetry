// Apply Chosen Precision Level to GPS Coordinates
module.exports = async function (
    interpreted,
    { CoordinatesPrecision }
  ) {
    //Copy input
    let result = interpreted
    for (const key in result) {
      if (result[key].streams) {
        for (const k in result[key].streams) {
          const samples = result[key].streams[k].samples;
          let newSamples = [];
          if(samples) {
            for (let i = 0; i < samples.length; i++) {
              let newSample = samples[i]
              newSample.value[0] = parseFloat(newSample.value[0].toFixed(CoordinatesPrecision))
              newSample.value[1] = parseFloat(newSample.value[1].toFixed(CoordinatesPrecision))
              newSamples.push(newSample)
            }
          }
          result[key].streams[k].samples = newSamples
        }
      }
    }
    return result
  }
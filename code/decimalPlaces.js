// Apply Chosen Decimal Places to Number Values
module.exports = async function (
    interpreted,
    { decimalPlaces }
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
              let newSample = samples[i];
              for (let j = 0; j < newSample.value.length; j++) {
                if (!isNaN(newSample.value[j])) {
                  newSample.value[j] = parseFloat(newSample.value[j].toFixed(decimalPlaces));
                }
              }
              newSamples.push(newSample);
            }
          }
          result[key].streams[k].samples = newSamples
        }
      }
    }
    return result
  }
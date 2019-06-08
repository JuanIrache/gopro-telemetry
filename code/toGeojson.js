//Returns the GPS data as an object for geojson
function getGPGS5Data(data) {
  let properties = {};
  for (const key in data) {
    //Save device name
    if (data[key]['device name'] != null) properties.device = data[key]['device name'];
    if (data[key].streams) {
      for (const stream in data[key].streams) {
        //If we find a GPS5 stream, we won't look on any other DEVCS
        if (stream === 'GPS5' && data[key].streams.GPS5.samples && data[key].streams.GPS5.samples.length) {
          //Save altitude offset
          if (data[key].streams.GPS5.samples[0].sticky && data[key].streams.GPS5.samples[0].sticky.geoidHeight) {
            properties.geoidHeight = data[key].streams.GPS5.samples[0].sticky.geoidHeight;
          }
          let coordinates = [];
          //Will save utc and cts
          properties.AbsoluteUtcMicroSec = [];
          properties.RelativeMicroSec = [];
          //Loop all the samples
          data[key].streams.GPS5.samples.forEach((s, i) => {
            //Check that at least we have the valid values
            if (s.value && s.value.length > 1) {
              coordinates[i] = [s.value[1], s.value[0]];
              //Set elevation if present
              if (s.value.length > 1) coordinates[i].push(s.value[2]);
              //Set time if present
              if (s.date != null) properties.AbsoluteUtcMicroSec[i] = s.date.getTime();
              if (s.cts != null) properties.RelativeMicroSec[i] = s.cts;
            }
          });
          return { coordinates, properties };
        }
      }
    }
    return undefined;
  }
}

//Converts the processed data to geojson
module.exports = function(data, { name }) {
  const converted = getGPGS5Data(data);
  let result = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: converted.coordinates
    },
    properties: { name, ...converted.properties }
  };
  return result;
};

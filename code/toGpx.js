//Uses these specific terms for consistency with previous projects
const translations = {
  precision: 'GpsAccuracy',
  fix: 'GpsFix'
};

//Returns the GPS data as a string
function getGPGS5Data(data) {
  for (const key in data) {
    if (data[key].streams) {
      for (const stream in data[key].streams) {
        //If we find a GPS5 stream, we won't look on any other DEVCS
        if (stream === 'GPS5' && data[key].streams.GPS5.samples) {
          let result = '';
          let sticky = {};
          //Loop all the samples
          data[key].streams.GPS5.samples.forEach(s => {
            //Check that at least we have the valid values
            if (s.value && s.value.length > 2) {
              //Update and rememeber sticky data
              if (s.sticky) sticky = { ...sticky, ...s.sticky };
              let partialSticky = [];
              let cmt;
              //Create comments for sample, in principle precision and fix
              for (const key in sticky) partialSticky.push(`${translations[key] || key}: ${sticky[key]}`);
              //Create comment string
              if (partialSticky.length)
                cmt = `
                    <cmt>${partialSticky.join('; ')}</cmt>`;
              //Create sample string
              const partial = `
                <trkpt lat="${s.value[0]}" lon="${s.value[1]}">
                    <ele>${s.value[2]}</ele>
                    <time>2019-01-03T16:31:51.849Z</time>${cmt || ''}
                </trkpt>`;
              //Add it to samples
              result += `${partial}`;
            }
          });
          return result;
        }
      }
    }
    return '';
  }
}

//Converts the processed data to GPX
module.exports = function(data, { name }) {
  let string = `\
    <?xml version="1.0" encoding="UTF-8"?>
    <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="https://github.com/juanirache/gopro-telemetry">
        <trk>
            <name>${name}</name>
            <trkseg>
                ${getGPGS5Data(data).replace(/^\s+/, '')}
            </trkseg>
	    </trk>
    </gpx>`;
  return string;
};

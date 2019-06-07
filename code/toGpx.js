const translations = {
  precision: 'GpsAccuracy',
  fix: 'GpsFix'
};

function getGPGS5Data(data) {
  for (const key in data) {
    if (data[key].streams) {
      for (const stream in data[key].streams) {
        if (stream === 'GPS5' && data[key].streams.GPS5.samples) {
          let result = '';
          let sticky = {};
          data[key].streams.GPS5.samples.forEach(s => {
            if (s.value && s.value.length > 2) {
              if (s.sticky) sticky = { ...sticky, ...s.sticky };
              let partialSticky = [];
              let cmt;
              for (const key in sticky) partialSticky.push(`${translations[key] || key}: ${sticky[key]}`);
              if (partialSticky.length)
                cmt = `
                    <cmt>${partialSticky.join('; ')}</cmt>`;
              const partial = `
                <trkpt lat="${s.value[0]}" lon="${s.value[1]}">
                    <ele>${s.value[2]}</ele>
                    <time>2019-01-03T16:31:51.849Z</time>${cmt || ''}
                </trkpt>`;
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

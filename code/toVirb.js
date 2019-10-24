//Returns the GPS data as a string
function getGPGS5Data(data) {
  let frameRate;
  let inner = '';
  let device = '';
  if (data['frames/second'] != null) frameRate = `${Math.round(data['frames/second'])} fps`;
  for (const key in data) {
    if (data[key]['device name'] != null) device = data[key]['device name'];
    if (data[key].streams) {
      for (const stream in data[key].streams) {
        //If we find a GPS5 stream, we won't look on any other DEVCS
        if (stream === 'GPS5' && data[key].streams.GPS5.samples) {
          let name;
          if (data[key].streams.GPS5.name != null) name = data[key].streams.GPS5.name;
          let units;
          if (data[key].streams.GPS5.units != null)
            units = `[${data[key].streams.GPS5.units.toString()}]`;
          let sticky = {};
          //Loop all the samples
          data[key].streams.GPS5.samples.forEach(s => {
            //Check that at least we have the valid values
            if (s.value && s.value.length > 1) {
              //Update and remember sticky data
              if (s.sticky) sticky = { ...sticky, ...s.sticky };
              let time = '';
              let ele = '';
              let speed = '';
              let geoidHeight = '';
              //Use sticky info
              if (sticky.geoidHeight != null)
                geoidHeight = `
                <geoidheight>${sticky[key]}</geoidheight>`;
              //Set elevation if present
              if (s.value.length > 1)
                ele = `
                <ele>${s.value[2]}</ele>`;
              //Set time if present
              if (s.date != null) {
                if (typeof s.date != 'object') s.date = new Date(s.date);
                try {
                  time = `
                <time>${s.date.toISOString()}</time>`;
                } catch (error) {
                  time = `
                <time>${s.date}</time>`;
                  setImmediate(() => console.error(error.message || error), s.date);
                }
              }
              //Set speed if present, in Garmin format: https://www8.garmin.com/xmlschemas/TrackPointExtensionv2.xsd
              if (s.value.length > 4)
                speed = `
                <extensions>
                  <gpxtpx:TrackPointExtension>
                    <gpxtpx:speed>${s.value[4]}</gpxtpx:speed>
                  </gpxtpx:TrackPointExtension>
                </extensions>`;
              //Create sample string
              const partial = `
            <trkpt lat="${s.value[0]}" lon="${s.value[1]}">
                ${(ele + time + geoidHeight + speed).trim()}
            </trkpt>`;
              //Add it to samples
              inner += `${partial}`;
            }
          });
          //Create description of file/stream
          const description = [frameRate, name, units].filter(e => e != null).join(' - ');
          return { inner, description, device };
        }
      }
    }
  }
  return { inner, description: frameRate || '', device };
}

//Converts the processed data to GPX
module.exports = function(data, { name }) {
  const converted = getGPGS5Data(data);
  if (!converted) return undefined;
  let string = `\
<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v2" version="1.1" creator="https://github.com/juanirache/gopro-telemetry">
    <trk>
        <name>${name}</name>
        <desc>${converted.description}</desc>
        <src>${converted.device}</src>
        <trkseg>
            ${converted.inner.trim()}
        </trkseg>
  </trk>
</gpx>`;
  return string;
};

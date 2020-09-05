const breathe = require('../utils/breathe');

//Returns the GPS data as a string
async function getGPGS5Data(data) {
  let frameRate;
  let inner = '';
  let device = '';
  if (data['frames/second'] != null)
    frameRate = `${Math.round(data['frames/second'])} fps`;
  for (const key in data) {
    if (data[key]['device name'] != null) device = data[key]['device name'];
    if (data[key].streams) {
      for (const stream in data[key].streams) {
        await breathe();
        //If we find a GPS5 stream, we won't look on any other DEVCS
        if (stream === 'GPS5' && data[key].streams.GPS5.samples) {
          let name;
          if (data[key].streams.GPS5.name != null)
            name = data[key].streams.GPS5.name;
          let units;
          if (data[key].streams.GPS5.units != null)
            units = `[${data[key].streams.GPS5.units.toString()}]`;
          let sticky = {};
          //Loop all the samples

          for (let i = 0; i < data[key].streams.GPS5.samples.length; i++) {
            const s = data[key].streams.GPS5.samples[i];
            //Check that at least we have the valid values
            if (s.value && s.value.length > 1) {
              //Update and remember sticky data
              if (s.sticky) sticky = { ...sticky, ...s.sticky };
              let time = '';
              let ele = '';
              let geoidHeight = '';
              //Use sticky info
              if (sticky.geoidHeight != null)
                geoidHeight = `
                <geoidheight>${sticky.geoidHeight}</geoidheight>`;
              //Set elevation if present
              if (s.value.length > 1)
                ele = `
                <ele>${s.value[2]}</ele>`;
              //Set time if present
              if (s.date != null) {
                if (typeof s.date != 'object') s.date = new Date(s.date);
                try {
                  time = `
                <time>${s.date
                  .toISOString()
                  .replace(/\.(\d{3})Z$/, 'Z')}</time>`;
                } catch (e) {
                  time = `
                <time>${s.date}</time>`;
                }
              }
              //Create sample string
              const partial = `
            <trkpt lat="${s.value[0]}" lon="${s.value[1]}">
                ${(ele + time + geoidHeight).trim()}
            </trkpt>`;
              if (i === 0 && s.cts > 0) {
                // If first sample missing, fake it for better sync
                let firstDate;
                try {
                  firstDate = new Date(s.date.getTime() - s.cts)
                    .toISOString()
                    .replace(/\.(\d{3})Z$/, 'Z');
                } catch (e) {
                  firstDate = new Date(s.date - s.cts)
                    .toISOString()
                    .replace(/\.(\d{3})Z$/, 'Z');
                }
                const firstTime = `
                <time>${firstDate}</time>`;
                const fakeFirst = `
                <trkpt lat="${s.value[0]}" lon="${s.value[1]}">
                    ${(ele + firstTime + geoidHeight).trim()}
                </trkpt>`;
                inner += `${fakeFirst}`;
              }
              //Add it to samples
              inner += `${partial}`;
            }
          }
          //Create description of file/stream
          const description = [frameRate, name, units]
            .filter(e => e != null)
            .join(' - ');
          return { inner, description, device };
        }
      }
    }
  }
  return { inner, description: frameRate || '', device };
}

// Creates accelerometer GPX content for Virb
async function getACCLData(data) {
  let frameRate;
  let inner = '';
  let device = '';
  if (data['frames/second'] != null)
    frameRate = `${Math.round(data['frames/second'])} fps`;
  for (const key in data) {
    if (data[key]['device name'] != null) device = data[key]['device name'];
    if (data[key].streams) {
      for (const stream in data[key].streams) {
        await breathe();
        //If we find a GPS5 stream, we won't look on any other DEVCS
        if (stream === 'ACCL' && data[key].streams.ACCL.samples) {
          let name;
          if (data[key].streams.ACCL.name != null)
            name = data[key].streams.ACCL.name;
          let units = `[g]`;
          //Loop all the samples
          for (let i = 0; i < data[key].streams.ACCL.samples.length; i++) {
            const s = data[key].streams.ACCL.samples[i];
            //Check that at least we have the valid values
            if (s.value && s.value.length) {
              let time = '';
              let acceleration = '';

              //Set time if present
              if (s.date != null) {
                if (typeof s.date != 'object') s.date = new Date(s.date);
                try {
                  time = `
                  <time>${s.date.toISOString()}</time>`;
                } catch (e) {
                  time = `
                  <time>${s.date}</time>`;
                }
              }

              acceleration = `
                  <extensions>
                    <gpxacc:AccelerationExtension>
                      <gpxacc:accel offset="0" x="${s.value[1] / 9.80665}" y="${
                s.value[2] / 9.80665
              }" z="${s.value[0] / 9.80665}"/>
                      <gpxacc:accel offset="0" x="${s.value[1] / 9.80665}" y="${
                s.value[2] / 9.80665
              }" z="${s.value[0] / 9.80665}"/>
                    </gpxacc:AccelerationExtension>
                  </extensions>`;
              //Create sample string
              const partial = `
              <trkpt lat="0" lon="0">
                  ${(time + acceleration).trim()}
              </trkpt>`;
              if (i === 0 && s.cts > 0) {
                // If first sample missing, fake it for better sync
                let firstDate;
                try {
                  firstDate = new Date(s.date.getTime() - s.cts).toISOString();
                } catch (e) {
                  firstDate = new Date(s.date - s.cts).toISOString();
                }
                const firstTime = `
                <time>${firstDate}</time>`;
                const firstAccel = `
                <extensions>
                  <gpxacc:AccelerationExtension>
                    <gpxacc:accel offset="0" x="0" y="0" z="0"/>
                    <gpxacc:accel offset="0" x="0" y="0" z="0"/>
                  </gpxacc:AccelerationExtension>
                </extensions>`;
                const fakeFirst = `
                <trkpt lat="0" lon="0">
                  ${(firstTime + firstAccel).trim()}
              </trkpt>`;
                inner += `${fakeFirst}`;
              }
              //Add it to samples
              inner += `${partial}`;
            }
          }
          //Create description of file/stream
          const description = [frameRate, name, units]
            .filter(e => e != null)
            .join(' - ');
          return { inner, description, device };
        }
      }
    }
  }
  return { inner, description: frameRate || '', device };
}

//Converts the processed data to GPX
module.exports = async function (data, { name, stream }) {
  let converted;
  if (stream[0] === 'GPS5') converted = await getGPGS5Data(data);
  else if (stream[0] === 'ACCL') converted = await getACCLData(data);
  else return undefined;
  if (!converted) return undefined;
  let string = `\
<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1"
    xmlns:gpxacc="http://www.garmin.com/xmlschemas/AccelerationExtension/v1"
    version="1.1"
    creator="https://github.com/juanirache/gopro-telemetry">
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

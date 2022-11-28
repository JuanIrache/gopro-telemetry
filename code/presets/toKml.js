const breathe = require('../utils/breathe');

//Returns the GPS data as a string
async function getGPSData(data) {
  let frameRate;
  let device;
  let inner = '';
  if (data['frames/second'] != null)
    frameRate = `${Math.round(data['frames/second'])} fps`;
  for (const key in data) {
    if (data[key]['device name'] != null) device = data[key]['device name'];
    if (data[key].streams) {
      for (const stream in data[key].streams) {
        await breathe();
        //If we find a GPS stream, we won't look on any other DEVCS
        if (
          (stream === 'GPS5' || stream === 'GPS9') &&
          data[key].streams[stream].samples
        ) {
          let name;
          if (data[key].streams[stream].name != null) {
            name = data[key].streams[stream].name;
          }
          let units;
          if (data[key].streams[stream].units != null) {
            units = data[key].streams[stream].units.toString();
          }
          let sticky = {};
          //Loop all the samples
          for (let i = 0; i < data[key].streams[stream].samples.length; i++) {
            const s = data[key].streams[stream].samples[i];
            //Check that at least we have the valid values
            if (s.value && s.value.length > 1) {
              //Update and remember sticky data
              if (s.sticky) sticky = { ...sticky, ...s.sticky };
              let commentParts = [];
              let cmt = '';
              let time = '';
              let altitudeMode = '';
              //Create comments for sample
              for (const key in sticky) {
                if (key === 'precision') {
                  if (stream === 'GPS5') {
                    commentParts.push(`GPS DOP: ${sticky[key] / 100}`);
                  }
                } else if (key === 'fix') {
                  if (stream === 'GPS5') {
                    commentParts.push(`GPS Fix: ${sticky[key]}`);
                  }
                } else {
                  commentParts.push(`${key}: ${sticky[key]}`);
                }
              }
              if (stream === 'GPS9') {
                if (s.value.length > 7) {
                  commentParts.push(`GPS DOP: ${s.value[7]}`);
                }
                if (s.value.length > 8) {
                  commentParts.push(`GPS Fix: ${s.value[8]}`);
                }
              }
              if (s.value.length > 3) {
                commentParts.push(`2D Speed: ${s.value[3]}`);
              }
              if (s.value.length > 4) {
                commentParts.push(`3D Speed: ${s.value[4]}`);
              }
              //Create comment string
              if (commentParts.length) {
                cmt = `
            <description>${commentParts.join('; ')}</description>`;
              }
              //Set time if present
              if (s.date != null) {
                if (typeof s.date != 'object') s.date = new Date(s.date);
                try {
                  time = `
            <TimeStamp>
                <when>${s.date.toISOString()}</when>
            </TimeStamp>`;
                } catch (e) {
                  time = `
            <TimeStamp>
                <when>${s.date}</when>
            </TimeStamp>`;
                }
              }
              //Prepare coordinates
              let coords = [s.value[1], s.value[0]];
              //Set elevation if present
              if (s.value.length > 2) {
                coords.push(s.value[2]);
                altitudeMode = `
            <altitudeMode>absolute</altitudeMode>`;
              }
              //Create sample string
              const partial = `
        <Placemark>
            ${cmt.trim()}
            <Point>
                ${altitudeMode.trim()}
                <coordinates>${coords.join(',')}</coordinates>
            </Point>
            ${time.trim()}
        </Placemark>`;
              //Add it to samples
              inner += `${partial}`;
            }
          }
          //Create description of file/stream
          const description = [device, frameRate, name, units]
            .filter(e => e != null)
            .join('. ');
          return { inner, description };
        }
      }
    }
  }
  return {
    inner,
    description: [device, frameRate].filter(e => e != null).join('. ')
  };
}

//Converts the processed data to KML
module.exports = async function (data, { name }) {
  const converted = await getGPSData(data);
  let string = `\
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">
    <Document>
        <name>${name}</name>
        <atom:author>
            <atom:name>gopro-telemetry by Juan Irache</atom:name>
        </atom:author>
        <atom:link href="https://github.com/JuanIrache/gopro-telemetry"/>
        <description>${converted.description}</description>
        ${converted.inner.trim()}
    </Document>
</kml>`;
  return string;
};

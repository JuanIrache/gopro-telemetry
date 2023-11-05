const breathe = require('../utils/breathe');

const fixes = {
  0: 'none',
  2: '2d',
  3: '3d'
};

//Returns the GPS data as a string
async function getGPS5Data(data, comment) {
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
        //If we find a GPS stream, we won't look on any other DEVCS
        if (
          (stream === 'GPS5' || stream === 'GPS9') &&
          data[key].streams[stream].samples
        ) {
          let units;
          let name;
          if (data[key].streams[stream].name != null) {
            name = data[key].streams[stream].name;
          }
          if (data[key].streams[stream].units != null) {
            units = `[${data[key].streams[stream].units.toString()}]`;
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
              let ele = '';
              let fix = '';
              let hdop = '';
              let geoidHeight = '';
              //Use sticky info
              for (const key in sticky) {
                if (key === 'fix') {
                  if (stream === 'GPS5') {
                    fix = `
              <fix>${fixes[sticky[key]] || 'none'}</fix>`;
                  }
                } else if (key === 'precision') {
                  if (stream === 'GPS5') {
                    hdop = `
              <hdop>${sticky[key] / 100}</hdop>`;
                  }
                } else if (key === 'geoidHeight') {
                  geoidHeight = `
              <geoidheight>${sticky[key]}</geoidheight>`;
                } else if (comment) {
                  commentParts.push(`${key}: ${sticky[key]}`);
                }
              }
              if (stream === 'GPS9') {
                if (s.value.length > 7) {
                  hdop = `
              <hdop>${s.value[7]}</hdop>`;
                }
                if (s.value.length > 8) {
                  fix = `
              <fix>${s.value[8]}</fix>`;
                }
              }
              if (comment) {
                //Could potentially add other values to cmt
                if (s.value.length > 3) {
                  commentParts.push(`2dSpeed: ${s.value[3]}`);
                }
                //Speeds as comment
                if (s.value.length > 4) {
                  commentParts.push(`3dSpeed: ${s.value[4]}`);
                }
                //Create comment string
                if (commentParts.length) {
                  cmt = `
              <cmt>${commentParts.join('; ')}</cmt>`;
                }
              }
              //Set elevation if present
              if (s.value.length > 1) {
                ele = `
              <ele>${s.value[2]}</ele>`;
              }
              //Set time if present
              if (s.date != null) {
                if (typeof s.date != 'object') s.date = new Date(s.date);
                try {
                  time = `
              <time>${s.date.toISOString()}</time>`;
                } catch (error) {
                  time = `
              <time>${s.date}</time>`;
                }
              }
              //Create sample string
              const partial = `
          <trkpt lat="${s.value[0]}" lon="${s.value[1]}">
              ${(ele + time + fix + hdop + geoidHeight + cmt).trim()}
          </trkpt>`;
              if (i === 0 && s.cts > 0) {
                // If first sample missing, fake it for better sync
                let firstDate;
                try {
                  firstDate = new Date(s.date.getTime() - s.cts).toISOString();
                } catch (e) {}
                const firstTime = `
              <time>${firstDate}</time>`;
                const fakeFirst = `
          <trkpt lat="${s.value[0]}" lon="${s.value[1]}">
                ${(ele + firstTime + fix + hdop + geoidHeight + cmt).trim()}
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
module.exports = async function (data, { name, comment }) {
  const converted = await getGPS5Data(data, comment);
  if (!converted) return undefined;
  let string = `\
<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="https://github.com/juanirache/gopro-telemetry">
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

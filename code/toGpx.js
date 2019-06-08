//Returns the GPS data as a string
function getGPGS5Data(data) {
  let frameRate;
  if (data['frames/second'] != null) frameRate = `${Math.round(data['frames/second'])} fps`;
  for (const key in data) {
    let device;
    if (data[key]['device name'] != null) device = data[key]['device name'];
    if (data[key].streams) {
      for (const stream in data[key].streams) {
        //If we find a GPS5 stream, we won't look on any other DEVCS
        if (stream === 'GPS5' && data[key].streams.GPS5.samples) {
          let name;
          if (data[key].streams.GPS5.name != null) name = data[key].streams.GPS5.name;
          let units;
          if (data[key].streams.GPS5.units != null) units = data[key].streams.GPS5.units.toString();
          let inner = '';
          let sticky = {};
          //Loop all the samples
          data[key].streams.GPS5.samples.forEach(s => {
            //Check that at least we have the valid values
            if (s.value && s.value.length > 1) {
              //Update and remember sticky data
              if (s.sticky) sticky = { ...sticky, ...s.sticky };
              let partialSticky = [];
              let cmt = '';
              let time = '';
              let ele = '';
              let speed = '';
              let fix = '';
              let hdop = '';
              let geoidHeight = '';
              //Use precision and fix tags
              for (const key in sticky) {
                if (key === 'fix')
                  fix = `
                <fix>${sticky[key]}</fix>`;
                else if (key === 'precision')
                  hdop = `
                <hdop>${sticky[key]}</hdop>`;
                else if (key === 'geoidHeight')
                  geoidHeight = `
                <geoidheight>${sticky[key]}</geoidheight>`;
                else partialSticky.push(`${key}: ${sticky[key]}`);
              }
              //Could potentially add other values to cmt
              if (s.value.length > 3) partialSticky.push(`2dSpeed: ${s.value[3]}`);
              //Create comment string
              if (partialSticky.length)
                cmt = `
                <cmt>${partialSticky.join('; ')}</cmt>`;
              //Set elevation if present
              if (s.value.length > 1)
                ele = `
                <ele>${s.value[2]}</ele>`;
              //Set time if present
              if (s.date != null)
                time = `
                <time>${s.date.toISOString()}</time>`;
              //Set speed if present
              if (s.value.length > 4)
                speed = `
                <speed>${s.value[4]}</speed>`;
              //Create sample string
              const partial = `
            <trkpt lat="${s.value[0]}" lon="${s.value[1]}">
                ${(ele + time + speed + fix + hdop + geoidHeight + cmt).trim()}
            </trkpt>`;
              //Add it to samples
              inner += `${partial}`;
            }
          });
          //Create description of file/stream
          const description = [frameRate, name, units].filter(e => e != null).join('. ');
          return { inner, description, device };
        }
      }
    }
    return '';
  }
}

//Converts the processed data to GPX
module.exports = function(data, { name }) {
  const converted = getGPGS5Data(data);
  let string = `\
<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="https://github.com/juanirache/gopro-telemetry">
    <trk>
        <name>${name}</name>
        <src>${converted.device}</src>
        <desc>${converted.description}</desc>
        <trkseg>
            ${converted.inner.trim()}
        </trkseg>
  </trk>
</gpx>`;
  return string;
};

//Returns the GPS data as a string
function getGPGS5Data(data) {
  if (data['frames/second'] != null) {
    let files = {};
    for (const key in data) {
      let device = key;
      if (data[key]['device name'] != null) device = data[key]['device name'];
      if (data[key].streams) {
        for (const stream in data[key].streams) {
          //We try to save all valid streams
          if (data[key].streams[stream].samples && data[key].streams[stream].samples.length) {
            //Prepare string
            let rows = [];
            //Get name and units to prepare headers
            //Loop all the samples
            data[key].streams[stream].samples.forEach((s, i, { length }) => {
              //Check that at least we have the valid values
              if (s.value != null) {
                //Force convert to array
                if (!Array.isArray(s.value)) s.value = [s.value];
                let row = [];
                //Add frame number
                row.push('', i + 1);
                //Add all values
                s.value.forEach((v, ii) => {
                  if (ii < 3) {
                    if (typeof v === 'number' || typeof v === 'string') row.push(v);
                    else row.push(JSON.stringify(v));
                  }
                });
                //Add line to rows
                rows.push(row.map(e => `"${e.toString().replace(/"/g, '""')}"`).join(','));
              }
            });

            //Join all lines
            files[`${device}-${stream}`] = `Adobe After Effects 8.0 Keyframe Data,,,,
,,,,
,Units Per Second,${data['frames/second']},,
,Source Width,100,,
,Source Height,100,,
,Source Pixel Aspect Ratio,1,,
,Comp Pixel Aspect Ratio,1,,
,,,,
Transform,Position,,,
,Frame,X pixels,Y pixels,Z pixels
${rows.join('\n')}
,,,,
,,,,
End of Keyframe Data,,,,
`;
          }
        }
      }
    }
    return files;
  } else {
    throw new Error('After Effects needs frameRate information');
  }
}

//Converts the processed data to After Effects pastable format
module.exports = getGPGS5Data;

const deduceHeaders = require('./deduceHeaders');
const promisify = require('./utils/promisify');

//Returns the data as a string
async function createCSV(data) {
  let files = {};
  for (const key in data) {
    let device = key;
    if (data[key]['device name'] != null) device = data[key]['device name'];
    if (data[key].streams) {
      for (const stream in data[key].streams) {
        await promisify(async () => {
          //We try to save all valid streams
          if (
            data[key].streams[stream].samples &&
            data[key].streams[stream].samples.length
          ) {
            //Prepare string
            let rows = [];
            //Get name and units to prepare headers
            let name = stream;
            if (data[key].streams[stream].name != null)
              name = data[key].streams[stream].name;
            let units;
            if (data[key].streams[stream].units != null)
              units = data[key].streams[stream].units;
            const headers = deduceHeaders({ name, units });
            let sticky = {};
            //Loop all the samples

            for (const s of data[key].streams[stream].samples) {
              await promisify(() => {
                //Check that at least we have the valid values
                if (s.value != null) {
                  //Force convert to array
                  if (!Array.isArray(s.value)) s.value = [s.value];
                  //Update and remember sticky data
                  if (s.sticky) sticky = { ...sticky, ...s.sticky };
                  //If first row
                  if (!rows.length) {
                    let firstRow = [];
                    //Add time
                    if (s.cts != null) firstRow.push('cts');
                    if (s.date != null) firstRow.push('date');
                    //Fill missing headers
                    for (let i = 0; i < s.value.length; i++) {
                      firstRow.push(headers[i] || i);
                    }
                    //Add stickies headers
                    firstRow.push(...Object.keys(sticky));
                    //Escape commas and add first row
                    rows.push(
                      firstRow
                        .map(e => `"${e.toString().replace(/"/g, '""')}"`)
                        .join(',')
                    );
                  }

                  let row = [];
                  //Add time
                  if (s.cts != null) row.push(s.cts);
                  if (s.date != null && typeof s.date != 'object')
                    s.date = new Date(s.date);
                  if (s.date != null) {
                    try {
                      row.push(s.date.toISOString());
                    } catch (error) {
                      row.push(s.date);
                      setImmediate(
                        () => console.error(error.message || error),
                        s.date
                      );
                    }
                  }
                  //Add all values
                  s.value.forEach(v => {
                    if (typeof v === 'number' || typeof v === 'string')
                      row.push(v);
                    else row.push(JSON.stringify(v));
                  });
                  //Add stickies values
                  for (const key in sticky) row.push(sticky[key]);
                  //Add line to rows
                  rows.push(
                    row
                      .map(e => `"${e.toString().replace(/"/g, '""')}"`)
                      .join(',')
                  );
                }
              });
            }
            //Join all lines
            files[`${device}-${stream}`] = rows.join('\n');
          }
        });
      }
    }
  }
  return files;
}

//Converts the processed data to csv
module.exports = createCSV;

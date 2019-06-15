const goproTelemetry = require(`${__dirname}/../`);
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

async function toJSON(filename) {
  try {
    const file = await readFileAsync(__dirname + filename);
    const result = goproTelemetry({ rawData: file }, { stream: 'FACE', preset: 'csv' });
    for (const key in result) await writeFileAsync('./' + key + '.csv', result[key]);
    console.log('File saved');
  } catch (error) {
    console.log(error);
  }
}

//Available files
//Fusion.raw, hero5.raw, hero6.raw, hero6+ble.raw, karma.raw, hero7.raw
const filename = '/hero6.raw';
toJSON(filename);

const goproTelemetry = require(`${__dirname}/../`);
const fs = require('fs');
const path = require('path');

const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

async function toJSON(filename) {
  try {
    const file = await readFileAsync(path.join(__dirname, filename));
    const result = await goproTelemetry(
      { rawData: file },
      {
        stream: 'GPS5',
        repeatSticky: true,
        repeatHeaders: true,
        GPS5Fix: 2,
        GPS5Precision: 500
      }
    );
    await writeFileAsync('./out.json', JSON.stringify(result));
    console.log('File saved');
  } catch (error) {
    console.error(error);
  }
}

//Available files
//Fusion.raw, hero5.raw, hero6.raw, hero6+ble.raw, karma.raw, hero7.raw
const filename = 'Fusion.raw';
toJSON(filename);

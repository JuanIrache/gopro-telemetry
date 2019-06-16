const goproTelemetry = require(`${__dirname}/../`);
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

async function toJSON(filename) {
  try {
    const file = await readFileAsync(__dirname + filename);
    const result = goproTelemetry({ rawData: file }, { stream: 'SCEN' });
    await writeFileAsync('./out.json', JSON.stringify(result));
    console.log('File saved');
  } catch (error) {
    console.log(error);
  }
}

//Available files
//Fusion.raw, hero5.raw, hero6.raw, hero6+ble.raw, karma.raw, hero7.raw
const filename = '/ignore/difficult.raw';
toJSON(filename);

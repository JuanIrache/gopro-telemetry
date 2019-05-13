const goproTelemetry = require('../');
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile); // (A)
const writeFileAsync = promisify(fs.writeFile); // (A)

//Available files
//Fusion.raw, hero5.raw, hero6.raw, hero6+ble.raw, karma.raw

async function toJSON() {
  try {
    const file = await readFileAsync(__dirname + filename);
    const result = goproTelemetry(file);
    await writeFileAsync('./out.json', JSON.stringify(result));
    console.log('File saved');
  } catch (error) {
    console.log(error);
  }
}

const filename = '/Fusion.raw';
toJSON(filename);

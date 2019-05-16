const goproTelemetry = require(`${__dirname}/../`);
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile); // (A)
const writeFileAsync = promisify(fs.writeFile); // (A)

async function toJSON(filename) {
  try {
    const file = await readFileAsync(__dirname + filename);
    const result = goproTelemetry(file, { debug: true });
    await writeFileAsync('./out.json', JSON.stringify(result));
    console.log('File saved');
  } catch (error) {
    console.log(error);
  }
}

//Available files
//Fusion.raw, hero5.raw, hero6.raw, hero6+ble.raw, karma.raw, hero7
const filename = '/Fusion.raw';
toJSON(filename);

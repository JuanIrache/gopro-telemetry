const processGPS = require('../code/processGPS');
const { readFileSync } = require('fs');

let result;

describe('Test GPS5', () => {
  beforeAll(async () => {
    const file = readFileSync(`${__dirname}/../samples/partials/grouped.json`);

    result = await processGPS(JSON.parse(file)['1'], { GPSPrecision: 500 });
  });

  test(`processGPS should filter out bad precision data`, () => {
    expect(result.DEVC[0].STRM[2].toDelete).toBe(true);
  });
});

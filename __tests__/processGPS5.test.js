const processGPS5 = require('../code/processGPS5');
const { readFileSync } = require('fs');

let result;

describe('Test GPS5', () => {
  beforeAll(async () => {
    const file = readFileSync(`${__dirname}/../samples/partials/grouped.json`);

    result = await processGPS5(JSON.parse(file)['1'], { GPS5Precision: 500 });
  });

  test(`processGPS5 should filter out bad precision data`, () => {
    expect(result.DEVC[0].STRM[2].toDelete).toBe(true);
  });
});

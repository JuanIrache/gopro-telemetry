const processGPS5 = require('../code/processGPS5');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/timed.json`);
const result = processGPS5(JSON.parse(file)['1'], { GPS5Precision: 500 });

test(`processGPS5 should filter out bad precision data`, () => {
  expect(result.DEVC[0].STRM.length).toBe(10);
});

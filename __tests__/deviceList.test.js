const deviceList = require('../code/deviceList');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/parsed.json`);
const result = deviceList(JSON.parse(file));

test(`deviceList should return the device list`, () => {
  expect(result).toEqual({ '1': 'Hero6 Black', '16778241': 'SENSORB6' });
});

const groupDevices = require('../code/groupDevices');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/parsed.json`);
const result = groupDevices(JSON.parse(file), {});

test(`groupDevices should merge all instances of the same device`, () => {
  expect(Object.keys(result)).toEqual(['1', '16778241']);
});

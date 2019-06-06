const groupTimes = require('../code/groupTimes');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/merged.json`);
const result = groupTimes(JSON.parse(file), { groupTimes: 25 });

test(`groupTimes should combine samples`, () => {
  expect(result['1'].streams.ACCL.samples.length).toBe(40);
});

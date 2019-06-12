const groupTimes = require('../code/groupTimes');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/merged.json`);
const result = groupTimes(JSON.parse(file), { groupTimes: 25 });
const resultFast = groupTimes(JSON.parse(file), { groupTimes: 25, disableInterpolation: true });

test(`groupTimes should combine samples`, () => {
  expect(result['1'].streams.ACCL.samples.length).toBe(40);
});

test(`disableInterpolationpick existing samples: different result from plain groupTimes`, () => {
  expect(resultFast['1'].streams.ACCL.samples[2].value[0]).not.toBe(result['1'].streams.ACCL.samples[2].value[0]);
});

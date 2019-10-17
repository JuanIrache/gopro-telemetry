const groupTimes = require('../code/groupTimes');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/merged.json`);
const result = groupTimes(JSON.parse(file), { groupTimes: 25 });
const resNoMerge = groupTimes(JSON.parse(file), { groupTimes: 25, disableMerging: true });
const resNoInter = groupTimes(JSON.parse(file), { groupTimes: 1, disableInterpolation: true });

test(`groupTimes should combine samples`, () => {
  expect(result['1'].streams.ACCL.samples.length).toBe(40);
});

test(`disableMerging existing samples: different result from plain groupTimes`, () => {
  expect(resNoMerge['1'].streams.ACCL.samples[2].value[0]).not.toBe(result['1'].streams.ACCL.samples[2].value[0]);
});

test(`disableInterpolation existing samples: different result from plain groupTimes`, () => {
  expect(resNoInter['1'].streams.ACCL.samples[2].value[0]).not.toBe(result['1'].streams.ACCL.samples[2].value[0]);
});

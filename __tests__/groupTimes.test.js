const groupTimes = require('../code/groupTimes');
const { readFileSync } = require('fs');

let result;
let resNoMerge;
let resNoInter;

describe('Test grouping times', () => {
  beforeAll(async () => {
    const file = readFileSync(`${__dirname}/../samples/partials/merged.json`);

    result = await groupTimes(JSON.parse(file), { groupTimes: 25 });
    resNoMerge = await groupTimes(JSON.parse(file), {
      groupTimes: 25,
      disableMerging: true
    });
    resNoInter = await groupTimes(JSON.parse(file), {
      groupTimes: 1,
      disableInterpolation: true
    });
  });

  test(`groupTimes should combine samples`, () => {
    expect(result['1'].streams.ACCL.samples.length).toBe(40);
  });

  test(`disableMerging existing samples: different result from plain groupTimes`, () => {
    expect(resNoMerge['1'].streams.ACCL.samples[2].value[0]).not.toBe(
      result['1'].streams.ACCL.samples[2].value[0]
    );
  });

  test(`disableInterpolation existing samples: different result from plain groupTimes`, () => {
    expect(resNoInter['1'].streams.ACCL.samples[2].value[0]).not.toBe(
      result['1'].streams.ACCL.samples[2].value[0]
    );
  });
});

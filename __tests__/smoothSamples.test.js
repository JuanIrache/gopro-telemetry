const smoothSamples = require('../code/smoothSamples');
const { readFileSync } = require('fs');

let result;

describe('Test smoothing', () => {
  beforeAll(async () => {
    const file = readFileSync(`${__dirname}/../samples/partials/merged.json`);
    result = await smoothSamples(JSON.parse(file), {
      smooth: 25
    });
  });

  test(`smoothSamples should reduce contrast between samples`, () => {
    expect(result['1'].streams.ACCL.samples[197].value[2]).toBe(
      -0.058336400441663605
    );
  });
});

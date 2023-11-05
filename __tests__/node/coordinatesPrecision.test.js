const coordinatesPrecision = require('../../code/coordinatesPrecision');
const { readFileSync } = require('fs');

let result;

describe('Test Coordinates Precision Application', () => {
  beforeAll(async () => {
    const file = readFileSync(`${__dirname}/../../samples/partials/mergedGps.json`);
    result = await coordinatesPrecision(JSON.parse(file), {
      CoordinatesPrecision: 3
    });
  });

  test(`coordinatesPrecision should reduce contrast between samples`, () => {
      const pickedSample = result['1'].streams.GPS5.samples[10].value
      expect(pickedSample[0]).toBe(33.126);
      expect(pickedSample[1]).toBe(-117.327);
  });
});

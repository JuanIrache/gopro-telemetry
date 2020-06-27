const toCsv = require('../code/presets/toCsv');
const { readFileSync } = require('fs');

let result;

describe('Test CSV', () => {
  beforeAll(async () => {
    const file = readFileSync(`${__dirname}/../samples/partials/merged.json`);

    result = await toCsv(JSON.parse(file), {});
  });

  test(`toCsv should label results by device-stream`, () => {
    expect(result['Hero6 Black-ACCL']).toBeDefined();
  });

  test(`toCsv should return key-string pairs`, () => {
    expect(result['Hero6 Black-ACCL'].length).toBeGreaterThan(20000);
  });

  test(`toCsv's result should start with the csv header row`, () => {
    expect(result['Hero6 Black-ACCL'].slice(0, 112)).toBe(
      '"cts","date","Accelerometer (z) [m/s2]","Accelerometer (x) [m/s2]","Accelerometer (y) [m/s2]","temperature [°C]"'
    );
  });
});

const toMgjson = require('../code/presets/toMgjson');
const { readFileSync } = require('fs');

let result;

describe('Test GPS5', () => {
  beforeAll(async () => {
    const file = readFileSync(
      `${__dirname}/../samples/partials/mergedGps.json`
    );

    result = await toMgjson(JSON.parse(file), {});
  });

  test(`toMgjson should follow geojson format`, () => {
    expect(result.dynamicDataInfo.utcInfo.precisionLength).toBe(3);
  });
  test(`toMgjson should describe data streams`, () => {
    expect(result.dataOutline[1].dataType.paddedStringProperties.maxLen).toBe(
      6
    );
  });
  test(`toMgjson should pad values`, () => {
    expect(result.dataDynamicSamples[0].samples[1].value[0]).toBe(
      '+0033.126496900000'
    );
  });
});

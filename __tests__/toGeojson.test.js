const toGeojson = require('../code/presets/toGeojson');
const { readFileSync } = require('fs');

let result;

describe('Test GeoJSON', () => {
  beforeAll(async () => {
    const file = readFileSync(
      `${__dirname}/../samples/partials/mergedGps.json`
    );

    result = await toGeojson(JSON.parse(file), {});
  });

  test(`toGeojson should follow geojson format`, () => {
    expect(result.geometry.type).toBe('LineString');
  });
  test(`toGeojson should contain coordinates`, () => {
    expect(result.geometry.coordinates[3]).toEqual([
      -117.3273541,
      33.1264967,
      -20.088
    ]);
  });
  test(`toGeojson should contain timing data`, () => {
    expect(result.properties.AbsoluteUtcMicroSec[3]).toBe(1492450263165);
  });
});

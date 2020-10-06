const toKml = require('../code/presets/toKml');
const { readFileSync } = require('fs');

let result;

describe('Test KML', () => {
  beforeAll(async () => {
    const file = readFileSync(
      `${__dirname}/../samples/partials/mergedGps.json`
    );

    result = await toKml(JSON.parse(file), {});
  });

  test(`toKml should return a long string`, () => {
    expect(result.length).toBeGreaterThan(7500);
  });

  test(`toKml should start with xml-kml format`, () => {
    expect(result.slice(0, 196)).toBe(
      `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
        <name>undefined</name>
        <description>Camera. 30 fps. GPS (Lat., Long., Alt., 2D sp`
    );
  });
});

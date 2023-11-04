const toKml = require('../../code/presets/toKml');
const { readFileSync } = require('fs');

let result;

describe('Test KML', () => {
  beforeAll(async () => {
    const file = readFileSync(
      `${__dirname}/../../samples/partials/mergedGps.json`
    );

    result = await toKml(JSON.parse(file), { comment: true });
  });

  test(`toKml should return a long string`, () => {
    expect(result.length).toBeGreaterThan(7500);
  });

  test(`toKml should export kml placemarks`, () => {
    expect(result.slice(478, 914)).toBe(`<Placemark>
            <description>GPS Fix: 3; GPS DOP: 6.06; geoidHeight: -34.03217630752571; 2D Speed: 0.167; 3D Speed: 0.19</description>
            <Point>
                <altitudeMode>absolute</altitudeMode>
                <coordinates>-117.3273542,33.1264969,-20.184</coordinates>
            </Point>
            <TimeStamp>
                <when>2017-04-17T17:31:03.000Z</when>
            </TimeStamp>
        </Placemark>`);
  });
});

describe('Test KML with CoordinatesPrecision', () => {
  beforeAll(async () => {
    const file = readFileSync(
      `${__dirname}/../../samples/partials/mergedGps.json`
    );

    result = await toKml(JSON.parse(file), {
      comment: true,
      CoordinatesPrecision: 6,
    });
  });

  test(`toKml should export kml placemarks`, () => {
    expect(result.slice(478, 912)).toBe(`<Placemark>
            <description>GPS Fix: 3; GPS DOP: 6.06; geoidHeight: -34.03217630752571; 2D Speed: 0.167; 3D Speed: 0.19</description>
            <Point>
                <altitudeMode>absolute</altitudeMode>
                <coordinates>-117.327354,33.126497,-20.184</coordinates>
            </Point>
            <TimeStamp>
                <when>2017-04-17T17:31:03.000Z</when>
            </TimeStamp>
        </Placemark>`);
  });
});

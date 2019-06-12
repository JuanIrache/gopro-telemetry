const toKml = require('../code/toKml');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/mergedGps.json`);
const result = toKml(JSON.parse(file), {});

test(`toKml should return a long string`, () => {
  expect(result.length).toBeGreaterThan(7500);
});

test(`toKml should start with xml-kml format`, () => {
  expect(result.slice(0, 196)).toBe(
    `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://earth.google.com/kml/2.0">
    <Document>
        <name>undefined</name>
        <description>Camera. 30 fps. GPS (Lat., Long., Alt., 2D s`
  );
});

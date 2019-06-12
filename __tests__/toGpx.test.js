const toGpx = require('../code/toGpx');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/mergedGps.json`);
const result = toGpx(JSON.parse(file), {});

test(`toGpx should return a long string`, () => {
  expect(result.length).toBeGreaterThan(6000);
});

test(`toGpx should start with html-gps format`, () => {
  expect(result.slice(0, 197)).toBe(
    `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="https://github.com/juanirache/gopro-telemetry">
    <trk>
        <name>undefined</name>`
  );
});

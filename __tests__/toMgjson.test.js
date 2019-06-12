const toMgjson = require('../code/toMgjson');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/mergedGps.json`);
const result = toMgjson(JSON.parse(file), {});

test(`toMgjson should follow geojson format`, () => {
  expect(result.dynamicDataInfo.utcInfo.precisionLength).toBe(3);
});
test(`toMgjson should describe data streams`, () => {
  expect(result.dataOutline[1].dataType.paddedStringProperties.maxLen).toBe(6);
});
test(`toMgjson should pad values`, () => {
  expect(result.dataDynamicSamples[0].samples[1].value[0]).toBe('+0033.126496900000');
});

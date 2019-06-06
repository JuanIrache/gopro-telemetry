const interpretKLV = require('../code/interpretKLV');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/grouped.json`);
const result = interpretKLV(JSON.parse(file)['1'], {});

test(`interpretKLV should apply scaling data`, () => {
  expect(result.DEVC[0].STRM[0].ACCL[0][0]).toBe(10.275119617224881);
});

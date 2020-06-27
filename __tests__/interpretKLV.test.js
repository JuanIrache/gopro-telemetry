const interpretKLV = require('../code/interpretKLV');
const { readFileSync } = require('fs');

let result;

describe('Test interpretation', () => {
  beforeAll(async () => {
    const file = readFileSync(
      `${__dirname}/../samples/partials/altitudeFix.json`
    );

    result = await interpretKLV(JSON.parse(file)['1'], {});
  });

  test(`interpretKLV should apply scaling data`, () => {
    expect(result.DEVC[0].STRM[0].ACCL[0][0]).toBe(10.275119617224881);
  });

  test(`interpretKLV should fix altitude`, () => {
    expect(result.DEVC[0].STRM[2].GPS5[0][2]).toBe(17.210718339310986);
  });
});

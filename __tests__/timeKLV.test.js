const timeKLV = require('../code/timeKLV');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/interpreted.json`);
const timing = {
  frameDuration: 0.03336666666666666,
  start: new Date('2017-12-31T12:15:25.000Z'),
  samples: [{ cts: 0, duration: 1001 }]
};
const result = timeKLV(JSON.parse(file)['1'], timing, {});

test(`timeKLV should assign times to all samples`, () => {
  expect(result.DEVC[0].STRM[1].GYRO[1].cts).toBe(5.055555555555555);
});

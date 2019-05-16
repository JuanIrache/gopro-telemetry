const parseV = require('../code/parseV');
const fs = require('fs');
const buffers = [];

for (let i = 0; i < 9; i++) {
  const buff = fs.readFileSync(`${__dirname}/../samples/buffers/buffer${i}`);
  buffers[i] = buff;
}

test(`GYRO value should match`, () => {
  expect(
    parseV({ data: buffers[0], options: {}, ks: { fourCC: 'GYRO', type: 's', size: 6, repeat: 3300 } }, 0, 2, {
      ax: 1,
      type: 's'
    })
  ).toBe(-70);
});

test(`ACCL value should match`, () => {
  expect(
    parseV({ data: buffers[1], options: {}, ks: { fourCC: 'ACCL', type: 's', size: 6, repeat: 199 } }, 0, 2, {
      ax: 1,
      type: 's'
    })
  ).toBe(3874);
});

test(`TICK value should match`, () => {
  expect(
    parseV({ data: buffers[2], options: {}, ks: { fourCC: 'TICK', type: 'L', size: 4, repeat: 1 } }, 0, 4, {
      ax: 1,
      type: 'L'
    })
  ).toBe(342433);
});

test(`GPS5 value should match`, () => {
  expect(
    parseV({ data: buffers[3], options: {}, ks: { fourCC: 'GPS5', type: 'l', size: 20, repeat: 18 } }, 0, 4, {
      ax: 1,
      type: 'L'
    })
  ).toBe(0);
});

test(`SCAL value should match`, () => {
  expect(
    parseV({ data: buffers[4], options: {}, ks: { fourCC: 'SCAL', type: 'l', size: 4, repeat: 8 } }, 0, 4, {
      ax: 1,
      type: 'l',
      complexType: 'lllfffff'
    })
  ).toBe(10000000);
});

test(`GPS5 value should match too`, () => {
  expect(
    parseV({ data: buffers[5], options: {}, ks: { fourCC: 'GPS5', type: 'l', size: 20, repeat: 18 } }, 0, 4, {
      ax: 1,
      type: 'l'
    })
  ).toBe(423424974);
});

test(`SHUT value should match`, () => {
  expect(
    parseV({ data: buffers[6], options: {}, ks: { fourCC: 'SHUT', type: 'f', size: 4, repeat: 30 } }, 0, 4, {
      ax: 1,
      type: 'f'
    })
  ).toBe(0.00103929138276726);
});

test(`Array of WRGB should match`, () => {
  expect(
    parseV({ data: buffers[7], options: {}, ks: { fourCC: 'WRGB', type: 'f', size: 12, repeat: 10 } }, 0, 12, {
      ax: 3,
      type: 'f'
    })
  ).toEqual([1.74609375, 1, 1.87890625]);
});

test(`Array of FACE should match`, () => {
  expect(
    parseV({ data: buffers[8], options: {}, ks: { fourCC: 'FACE', type: '?', size: 20, repeat: 1 } }, 0, 20, {
      ax: 5,
      type: '?',
      complexType: 'Lffff'
    })
  ).toEqual([1, 0.31822916865348816, 0.28518518805503845, 0.03437500074505806, 0.06111111119389534]);
});

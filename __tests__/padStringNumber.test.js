const pad = require('../code/utils/padStringNumber');

test(`Full numbers should pad correctly`, () => {
  expect(pad('123', 3, 1)).toBe('+123.0');
});

test(`Decimal numbers should pad correctly`, () => {
  expect(pad('0.123', 2, 4)).toBe('+00.1230');
});

test(`Numbers that match should only be signed`, () => {
  expect(pad('123.123', 3, 3)).toBe('+123.123');
});

test(`Negative numbers should pad right`, () => {
  expect(pad('-123.123', 4, 4)).toBe('-0123.1230');
});

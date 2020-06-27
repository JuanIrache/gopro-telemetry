const unArrayTypes = require('../code/utils/unArrayTypes');

test(`unArrayTypes should create a string of types given a string with an array indicator`, () => {
  expect(unArrayTypes('Lf[8]L')).toBe('LffffffffL');
});

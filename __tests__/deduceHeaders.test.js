const deduceHeaders = require('../code/utils/deduceHeaders');

test(`DeduceHeaders should create a header per sample with description and unit`, () => {
  expect(
    deduceHeaders({
      name: 'GPS (Lat., Long., Alt., 2D speed, 3D speed)',
      units: ['deg', 'deg', 'm', 'm/s', 'm/s']
    })
  ).toEqual([
    'GPS (Lat.) [deg]',
    'GPS (Long.) [deg]',
    'GPS (Alt.) [m]',
    'GPS (2D speed) [m/s]',
    'GPS (3D speed) [m/s]'
  ]);
});

test(`DeduceHeaders should create new headers dynamically`, () => {
  expect(
    deduceHeaders(
      {
        name: 'GPS (Lat., Long., Alt., 2D speed, 3D speed)',
        units: ['deg', 'deg', 'm', 'm/s', 'm/s']
      },
      { inn: 3, out: 4 }
    )
  ).toBe('GPS (2D speed) [m/s]');
});

test(`DeduceHeaders should work with fewer units`, () => {
  expect(
    deduceHeaders({
      name: 'Gyroscope',
      units: 'rad/s'
    })
  ).toEqual(['Gyroscope [rad/s]']);
});

test(`DeduceHeaders should work with just names`, () => {
  expect(
    deduceHeaders({
      name: 'Sensor ISO'
    })
  ).toEqual(['Sensor ISO']);
});

const goproTelemetry = require('./');
const fs = require('fs');

//Available files
//Fusion.raw, hero5.raw, hero6.raw, hero6+ble.raw, karma.raw
let filename, file, result;

describe('Testing with Fusion file', () => {
  beforeAll(() => {
    filename = 'Fusion';
    file = fs.readFileSync(`${__dirname}/samples/${filename}.raw`);
    result = goproTelemetry(file);
  });

  test(`Fusion should return valid metadata (DEVC)`, () => {
    expect(result.DEVC[0]).toBeDefined();
  });
  test(`Fusion should have a data stream (STRM)`, () => {
    expect(result.DEVC[0].STRM.length).toBeGreaterThan(0);
  });
  test(`Fusion should have shutter speed data (SHUT)`, () => {
    expect(result.DEVC[0].STRM[5].SHUT.length).toBeGreaterThan(0);
  });
  test(`Fusion should have stream names (STNM)`, () => {
    expect(typeof result.DEVC[0].STRM[4].STNM).toBe('string');
  });
  test(`Fusion should have scaling data (SCAL)`, () => {
    expect(typeof result.DEVC[0].STRM[3].SCAL[0]).toBe('number');
  });
  test(`Fusion should have units (SIUN)`, () => {
    expect(typeof result.DEVC[0].STRM[2].SIUN).toBe('string');
  });
  test(`Fusion should contain ticks (TICK)`, () => {
    expect(typeof result.DEVC[0].STRM[1].TICK).toBe('number');
  });
});

describe('Testing with hero5 file', () => {
  beforeAll(() => {
    filename = 'hero5';
    file = fs.readFileSync(`${__dirname}/samples/${filename}.raw`);
    result = goproTelemetry(file);
  });

  test(`hero5 should return valid metadata (DEVC)`, () => {
    expect(result.DEVC[0]).toBeDefined();
  });
  test(`hero5 should have a data stream (STRM)`, () => {
    expect(result.DEVC[0].STRM.length).toBeGreaterThan(0);
  });
  test(`hero5 should have float ISO data (ISOG)`, () => {
    expect(result.DEVC[0].STRM[3].ISOG[0]).toBeLessThan(2);
  });
  test(`hero5 should have GPS time (GPSU)`, () => {
    expect(result.DEVC[0].STRM[2].GPSU).toBe('170417173103.000');
  });
  test(`hero5 should have gyroscope units (SIUN)`, () => {
    expect(result.DEVC[0].STRM[1].SIUN).toBe('rad/s');
  });
  test(`hero5 should have stream names (STNM)`, () => {
    expect(result.DEVC[0].STRM[0].STNM).toBe('Accelerometer (up/down, right/left, forward/back)');
  });
});

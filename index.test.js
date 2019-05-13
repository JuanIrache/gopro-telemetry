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

  test(`${filename} should return valid metadata (DEVC)`, () => {
    expect(result.DEVC).toBeDefined();
  });
  test(`${filename} should have a data stream (STRM)`, () => {
    expect(result.DEVC.STRM.length).toBeGreaterThan(0);
  });
  test(`${filename} should have shutter speed data (SHUT)`, () => {
    expect(result.DEVC.STRM[5].SHUT.length).toBeGreaterThan(0);
  });
  test(`${filename} should have stream names (STNM)`, () => {
    expect(typeof result.DEVC.STRM[4].STNM).toBe('string');
  });
  test(`${filename} should have scaling data (SCAL)`, () => {
    expect(typeof result.DEVC.STRM[3].SCAL[0]).toBe('number');
  });
  test(`${filename} should have units (SIUN)`, () => {
    expect(typeof result.DEVC.STRM[2].SIUN).toBe('string');
  });
  test(`${filename} should contain ticks (TICK)`, () => {
    expect(typeof result.DEVC.STRM[1].TICK).toBe('number');
  });
});

describe('Testing with hero5 file', () => {
  beforeAll(() => {
    filename = 'hero5';
    file = fs.readFileSync(`${__dirname}/samples/${filename}.raw`);
    result = goproTelemetry(file);
  });

  test(`${filename} should return valid metadata (DEVC)`, () => {
    expect(result.DEVC).toBeDefined();
  });
  test(`${filename} should have a data stream (STRM)`, () => {
    expect(result.DEVC.STRM.length).toBeGreaterThan(0);
  });
  // test(`${filename} should have shutter speed data (SHUT)`, () => {
  //   expect(result.DEVC.STRM[5].SHUT.length).toBeGreaterThan(0);
  // });
  // test(`${filename} should have stream names (STNM)`, () => {
  //   expect(typeof result.DEVC.STRM[4].STNM).toBe('string');
  // });
  // test(`${filename} should have scaling data (SCAL)`, () => {
  //   expect(typeof result.DEVC.STRM[3].SCAL[0]).toBe('number');
  // });
  // test(`${filename} should have units (SIUN)`, () => {
  //   expect(typeof result.DEVC.STRM[2].SIUN).toBe('string');
  // });
  // test(`${filename} should contain ticks (TICK)`, () => {
  //   expect(typeof result.DEVC.STRM[1].TICK).toBe('number');
  // });
});

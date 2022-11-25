const parseKLV = require('../code/parseKLV');
const fs = require('fs');

let filename, file, result;

describe('Testing with Fusion file', () => {
  beforeAll(async () => {
    filename = 'Fusion';
    file = fs.readFileSync(`${__dirname}/../samples/${filename}.raw`);
    result = await parseKLV(file);
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
  beforeAll(async () => {
    filename = 'hero5';
    file = fs.readFileSync(`${__dirname}/../samples/${filename}.raw`);
    result = await parseKLV(file);
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
    expect(result.DEVC[0].STRM[0].STNM).toBe(
      'Accelerometer (up/down, right/left, forward/back)'
    );
  });
});

describe('Testing with hero6 file', () => {
  beforeAll(async () => {
    filename = 'hero6';
    file = fs.readFileSync(`${__dirname}/../samples/${filename}.raw`);
    result = await parseKLV(file);
  });

  test(`hero6 should return valid metadata (DEVC)`, () => {
    expect(result.DEVC[0]).toBeDefined();
  });
  test(`hero6 should have a data stream (STRM)`, () => {
    expect(result.DEVC[0].STRM.length).toBeGreaterThan(0);
  });
  test(`hero6 should have three values color data (WRGB)`, () => {
    expect(result.DEVC[0].STRM[10].WRGB[0].length).toBe(3);
  });
  test(`hero6 should have valid color temperature (WBAL)`, () => {
    expect(typeof result.DEVC[0].STRM[9].WBAL[0]).toBe('number');
  });
  test(`hero6 should have integer shutter speed data (ISOE)`, () => {
    expect(result.DEVC[0].STRM[6].ISOE[0]).toBe(181);
  });
  test(`hero6 should have face numbers (FCNM)`, () => {
    expect(result.DEVC[0].STRM[4].FCNM.length).toBe(15);
  });
});

describe('Testing with hero6+ble file', () => {
  beforeAll(async () => {
    filename = 'hero6+ble';
    file = fs.readFileSync(`${__dirname}/../samples/${filename}.raw`);
    result = await parseKLV(file);
  });

  test(`hero6+ble should contain two devices (DEVC)`, () => {
    expect(result.DEVC[1]).toBeDefined();
  });
  test(`hero6+ble should contain an external sensor (DVNM)`, () => {
    expect(result.DEVC[1].DVNM).toBe('SENSORB6');
  });
  test(`hero6+ble should have face samples, even if empty (FACE)`, () => {
    expect(result.DEVC[0].STRM[3].FACE.length).toBe(12);
  });
  test(`hero6+ble should have 5 values in GPS samples (GPS5)`, () => {
    expect(result.DEVC[0].STRM[2].GPS5[0].length).toBe(5);
  });
  test(`hero6+ble gyro should have a valid transformation matrix (MTRX)`, () => {
    expect(result.DEVC[0].STRM[1].MTRX.length).toBe(9);
  });
  test(`hero6+ble should have valid accelerometer data (ACCL)`, () => {
    expect(result.DEVC[0].STRM[0].ACCL[2][2]).toBe(4311);
  });
});

describe('Testing with karma file', () => {
  beforeAll(async () => {
    filename = 'karma';
    file = fs.readFileSync(`${__dirname}/../samples/${filename}.raw`);
    result = await parseKLV(file);
  });

  test(`karma should contain two devices (DEVC)`, () => {
    expect(result.DEVC[1]).toBeDefined();
  });
  test(`karma should contain karma data (DVNM)`, () => {
    expect(result.DEVC[1].DVNM).toBe('GoPro Karma v1.0');
  });
  test(`karma should have battery samples`, () => {
    expect(result.DEVC[1].STRM[1].KBAT[0].length).toBe(15);
  });
});

describe('Testing with hero7 file', () => {
  beforeAll(async () => {
    filename = 'hero7';
    file = fs.readFileSync(`${__dirname}/../samples/${filename}.raw`);
    result = await parseKLV(file);
  });

  test(`hero7 should contain multiple device entries (DEVC)`, () => {
    expect(result.DEVC.length).toBe(17);
  });
  test(`hero7 should contain image uniformity data (UNIF)`, () => {
    expect(result.DEVC[0].STRM[7].UNIF[8]).toBe(0.572265625);
  });
  test(`hero7 should have detailed face data (FACE)`, () => {
    expect(result.DEVC[3].STRM[3].FACE[0][0][5]).toBe(99);
  });
  test(`hero7 should have GPS precision data (GPSP)`, () => {
    expect(result.DEVC[8].STRM[2].GPSP).toBe(143);
  });
  test(`hero7 gyro should have accel orientation data (ORIO)`, () => {
    expect(result.DEVC[5].STRM[0].ORIO.length).toBe(3);
  });
});

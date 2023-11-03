const goproTelemetry = require('../../');
const fs = require('fs');

let filename, file, result;

const timing = {
  frameDuration: 0.03336666666666666,
  start: new Date('2017-12-31T12:15:25.000Z'),
  samples: [{ cts: 0, duration: 1001 }]
};

const slowBeforeAll = func => slowBeforeAll(func, 500000);
const slowTest = (name, func) => slowTest(name, func, 500000);

describe('Testing with karma file', () => {
  slowBeforeAll(async () => {
    filename = 'karma';
    file = fs.readFileSync(`${__dirname}/../../samples/${filename}.raw`);
    result = await goproTelemetry({ rawData: file }, { deviceList: true });
  });

  slowTest(`Karma should have two devices`, () => {
    expect(JSON.stringify(result)).toBe(
      '{"1":"Camera","16835857":"GoPro Karma v1.0"}'
    );
  });
});

describe('Testing with karma file as Uint8Array', () => {
  slowBeforeAll(async () => {
    filename = 'karma';
    file = new Uint8Array(
      fs.readFileSync(`${__dirname}/../../samples/${filename}.raw`)
    );
    result = await goproTelemetry({ rawData: file }, { deviceList: true });
  });

  slowTest(`Karma should have two devices`, () => {
    expect(JSON.stringify(result)).toBe(
      '{"1":"Camera","16835857":"GoPro Karma v1.0"}'
    );
  });
});

describe('Testing with hero6+ble.raw file', () => {
  slowBeforeAll(async () => {
    filename = 'hero6+ble';
    file = fs.readFileSync(`${__dirname}/../../samples/${filename}.raw`);
    result = await goproTelemetry({ rawData: file }, { streamList: true });
  });

  slowTest(`hero6+ble.raw should have specific keys`, () => {
    expect(Object.keys(result['1'].streams)).toEqual([
      'ACCL',
      'GYRO',
      'GPS5',
      'FACE',
      'FCNM',
      'ISOE',
      'SHUT',
      'WBAL',
      'WRGB'
    ]);
  });
});

describe('Testing deeper with hero6+ble file', () => {
  slowBeforeAll(async () => {
    filename = 'hero6+ble';
    file = fs.readFileSync(`${__dirname}/../../samples/${filename}.raw`);
    result = await goproTelemetry(
      { rawData: file },
      { device: 16778241, stream: 'acc1', repeatSticky: true }
    );
  });

  slowTest(`repeatSticky should be working for all samples`, () => {
    expect(
      JSON.stringify(result['16778241'].streams.acc1.samples[5].MFGI)
    ).toBeDefined();
  });
});

describe('Testing with hero7 file', () => {
  slowBeforeAll(async () => {
    filename = 'hero7';
    file = fs.readFileSync(`${__dirname}/../../samples/${filename}.raw`);
    result = await goproTelemetry(
      { rawData: file },
      { stream: 'ACCL', repeatHeaders: true, groupTimes: 1000 }
    );
  });

  slowTest(`groupTimes should simplify data samples`, () => {
    expect(result['1'].streams.ACCL.samples.length).toBe(18);
  });

  slowTest(`repeatHeaders should describe each value on each sample`, () => {
    expect(
      result['1'].streams.ACCL.samples[5]['Accelerometer (z) [m/s²]']
    ).toBeDefined();
  });
});

describe('Testing GPS5 with hero7 file', () => {
  slowBeforeAll(async () => {
    filename = 'hero7';
    file = fs.readFileSync(`${__dirname}/../../samples/${filename}.raw`);
    result = await goproTelemetry(
      { rawData: file, timing },
      {
        stream: 'GPS5',
        smooth: 20,
        GPSPrecision: 140,
        timeIn: 'MP4'
      }
    );
  });

  slowTest(`GPSPrecision should leave us with fewer, better samples`, () => {
    expect(result['1'].streams.GPS5.samples.length).toBe(219);
  });

  slowTest(`smooth should return averaged values`, () => {
    expect(result['1'].streams.GPS5.samples[5].value[0]).toBe(
      42.34258096153846
    );
  });

  slowTest(`timeIn: 'MP4' option should use mp4 timing dates`, () => {
    expect(result['1'].streams.GPS5.samples[0].date).toEqual(
      '2017-12-31T12:15:27.002Z'
    );
  });
});

describe('Testing with hero6 file', () => {
  slowBeforeAll(async () => {
    filename = 'hero6';
    file = fs.readFileSync(`${__dirname}/../../samples/${filename}.raw`);
    result = await goproTelemetry(
      { rawData: file },
      { GPSFix: 2, timeOut: 'cts' }
    );
  });

  slowTest(`GPSFix should discard bad GPS data`, () => {
    expect(result['1'].streams.GPS5).toBeUndefined();
  });

  slowTest(`timeOut:"cts" option should export cts time values`, () => {
    expect(result['1'].streams.FACE1.samples[1].cts).toBeDefined();
  });

  slowTest(`timeOut:'cts' option should discard date values`, () => {
    expect(result['1'].streams.FACE1.samples[6].date).toBeUndefined();
  });
});

describe('Testing with Fusion file', () => {
  slowBeforeAll(async () => {
    filename = 'Fusion';

    file = fs.readFileSync(`${__dirname}/../../samples/${filename}.raw`);
    result = await goproTelemetry(
      { rawData: file, timing },
      { ellipsoid: true }
    );
  });

  slowTest(
    `ellipsoid option should give bad height (relative to sea level)`,
    () => {
      expect(result['1'].streams.GPS5.samples[0].value[2]).toBe(-18.524);
    }
  );
});

describe('Testing joining consecutive files', () => {
  slowBeforeAll(async () => {
    filename = 'consecutive1';
    const filename2 = 'consecutive2';

    let timing = JSON.parse(
      fs.readFileSync(
        `${__dirname}/../../samples/partials/consecutiveTiming.json`
      )
    );
    timing = timing.map(t => ({ ...t, start: new Date(t.start) }));

    file = fs.readFileSync(`${__dirname}/../../samples/${filename}.raw`);
    const file2 = fs.readFileSync(
      `${__dirname}/../../samples/${filename2}.raw`
    );
    result = await goproTelemetry([
      { rawData: file, timing: timing[0] },
      { rawData: file2, timing: timing[1] }
    ]);
  });

  slowTest(`Consecutive files should add samples from two files`, () => {
    expect(result['1'].streams.ACCL.samples.length).toBe(1092);
  });

  slowTest(`Consecutive files should keep consecutive cts times`, () => {
    expect(result['1'].streams.ACCL.samples[1091].cts).toBe(10751.884057971107);
  });
});

describe('Testing reusing parsed data', () => {
  slowBeforeAll(async () => {
    filename = 'hero6';

    file = fs.readFileSync(`${__dirname}/../../samples/${filename}.raw`);
    result = [await goproTelemetry({ rawData: file, timing })];
    //Retrieve parsed data with a bunch of options to make sure that does not change the output
    const parsedData = await goproTelemetry(
      { rawData: file, timing },
      {
        raw: true,
        repeatSticky: true,
        repeatHeaders: true,
        timeOut: 'date',
        timeIn: 'GPS',
        groupTimes: 'frames',
        disableInterpolation: true,
        disableMerging: true,
        smooth: 5,
        ellipsoid: true,
        geoidHeight: true,
        GPSPrecision: 200,
        GPSFix: 3
      }
    );
    result.push(await goproTelemetry({ parsedData, timing }));
  });

  const keys = [
    'ACCL',
    'GYRO',
    'SHUT',
    'WBAL',
    'WRGB',
    'ISOE',
    'YAVG',
    'UNIF',
    'SCEN',
    'HUES',
    'GPS5',
    'GPS9',
    'CORI',
    'IORI',
    'GRAV',
    'WNDM',
    'MWET',
    'AALP',
    'MSKP',
    'LSKP'
  ];
  for (const key of keys) {
    slowTest(
      `Reused parsed data should output the same as binary data for "${key}"`,
      () => {
        if (result[0][1].streams[key]) {
          expect(result[0][1].streams[key].samples.slice(0, 3)).toEqual(
            result[1][1].streams[key].samples.slice(0, 3)
          );
        } else {
          expect(result[0][1]).toEqual(result[1][1]);
        }
      }
    );
  }
});

describe('Testing using new GPS9 stream', () => {
  slowBeforeAll(async () => {
    filename = 'hero11';
    file = fs.readFileSync(`${__dirname}/../../samples/${filename}.raw`);
    result = await goproTelemetry({ rawData: file }, { stream: 'GPS' });
  });

  slowTest(`GPS stream of HERO11 and newer should have GPS9 timestamps`, () => {
    expect(result['1'].streams.GPS9.samples[10].date.toISOString()).toBe(
      '2022-09-20T13:29:37.898Z'
    );
  });

  slowTest(
    `GPS stream of HERO11 and newer should have per-sample Fix data`,
    () => {
      expect(result['1'].streams.GPS9.samples[10].value[8]).toBe(3);
    }
  );
});

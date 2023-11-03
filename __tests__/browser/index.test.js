/// <reference types="jest" />
const { readFileSync } = require('fs');
const { join } = require('path');

const timing = {
  frameDuration: 0.03336666666666666,
  start: new Date('2017-12-31T12:15:25.000Z'),
  samples: [{ cts: 0, duration: 1001 }]
};

const slowBeforeAll = func => beforeAll(func, 500000);

describe('In browser', () => {
  /** @type {import('puppeteer').ElementHandle<HTMLInputElement>} */
  let inputHandle;
  slowBeforeAll(async () => {
    await page.goto(`file://${join(__dirname, './index.html')}`, {
      waitUntil: 'networkidle0',
      timeout: 1200000
    });
    inputHandle = await page.$('input[type=file]');
  });

  test('Library loaded', async () => {
    expect(1).toBe(1);
    expect(await page.evaluate(() => 1)).toBe(1);
    expect(await page.evaluate(() => typeof GoProTelemetry)).toBe('function');
    expect(await page.evaluate(() => GoProTelemetry.name)).toBe(
      'GoProTelemetry'
    );

    await inputHandle.uploadFile(join(__dirname, '../../samples/hero11.raw'));
    expect(
      await page.evaluate(
        () => document.querySelector('[type=file]').files[0] instanceof File
      )
    ).toBe(true);
    expect(
      await page.evaluate(
        async () => document.querySelector('[type=file]').files[0].size
      )
    ).toBe(75300);
    expect(
      await page.evaluate(async () => (await readFileAsBuffer(0)).length)
    ).toBe(75300);
  });

  let result;
  describe('Testing with karma file', () => {
    slowBeforeAll(async () => {
      const filename = 'karma';
      await inputHandle.uploadFile(
        join(__dirname, '../../samples/', `${filename}.raw`)
      );
      result = await page.evaluate(async () =>
        GoProTelemetry(
          { rawData: await readFileAsBuffer(0) },
          { deviceList: true }
        )
      );
    });

    test(`Karma should have two devices`, () => {
      expect(JSON.stringify(result)).toBe(
        '{"1":"Camera","16835857":"GoPro Karma v1.0"}'
      );
    });
  });

  describe('Testing with hero6+ble.raw file', () => {
    slowBeforeAll(async () => {
      const filename = 'hero6+ble';
      await inputHandle.uploadFile(
        join(__dirname, '../../samples/', `${filename}.raw`)
      );
      result = await page.evaluate(async () =>
        GoProTelemetry(
          { rawData: await readFileAsBuffer(0) },
          { streamList: true }
        )
      );
    });

    test(`hero6+ble.raw should have specific keys`, () => {
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
      const filename = 'hero6+ble';
      await inputHandle.uploadFile(
        join(__dirname, '../../samples/', `${filename}.raw`)
      );
      result = await page.evaluate(async () =>
        GoProTelemetry(
          { rawData: await readFileAsBuffer(0) },
          { device: 16778241, stream: 'acc1', repeatSticky: true }
        )
      );
    });

    test(`repeatSticky should be working for all samples`, () => {
      expect(
        JSON.stringify(result['16778241'].streams.acc1.samples[5].MFGI)
      ).toBeDefined();
    });
  });

  describe('Testing with hero7 file', () => {
    slowBeforeAll(async () => {
      const filename = 'hero7';
      await inputHandle.uploadFile(
        join(__dirname, '../../samples/', `${filename}.raw`)
      );
      result = await page.evaluate(async () =>
        GoProTelemetry(
          { rawData: await readFileAsBuffer(0) },
          { stream: 'ACCL', repeatHeaders: true, groupTimes: 1000 }
        ).then(result => {
          result['1'].streams = { ACCL: result['1'].streams.ACCL };
          return result;
        })
      );
    });

    test(`groupTimes should simplify data samples`, () => {
      expect(result['1'].streams.ACCL.samples.length).toBe(18);
    });

    test(`repeatHeaders should describe each value on each sample`, () => {
      expect(
        result['1'].streams.ACCL.samples[5]['Accelerometer (z) [m/s²]']
      ).toBeDefined();
    });
  });

  describe('Testing GPS5 with hero7 file', () => {
    slowBeforeAll(async () => {
      const filename = 'hero7';
      await inputHandle.uploadFile(
        join(__dirname, '../../samples/', `${filename}.raw`)
      );
      result = await page.evaluate(async timing => {
        timing.start = new Date(timing.start); // Date is lost when passing through puppeteer
        return GoProTelemetry(
          { rawData: await readFileAsBuffer(0), timing },
          {
            stream: 'GPS5',
            smooth: 20,
            GPSPrecision: 140,
            timeIn: 'MP4'
          }
        );
      }, timing);
    });

    test(`GPSPrecision should leave us with fewer, better samples`, () => {
      expect(result['1'].streams.GPS5.samples.length).toBe(219);
    });

    test(`smooth should return averaged values`, () => {
      expect(result['1'].streams.GPS5.samples[5].value[0]).toBe(
        42.34258096153846
      );
    });

    test(`timeIn: 'MP4' option should use mp4 timing dates`, () => {
      expect(result['1'].streams.GPS5.samples[0].date).toEqual(
        '2017-12-31T12:15:27.002Z'
      );
    });
  });

  describe('Testing with hero6 file', () => {
    slowBeforeAll(async () => {
      const filename = 'hero6';
      await inputHandle.uploadFile(
        join(__dirname, '../../samples/', `${filename}.raw`)
      );
      result = await page.evaluate(async () =>
        GoProTelemetry(
          { rawData: await readFileAsBuffer(0) },
          { GPSFix: 2, timeOut: 'cts' }
        )
      );
    });

    test(`GPSFix should discard bad GPS data`, () => {
      expect(result['1'].streams.GPS5).toBeUndefined();
    });

    test(`timeOut:"cts" option should export cts time values`, () => {
      expect(result['1'].streams.FACE1.samples[1].cts).toBeDefined();
    });

    test(`timeOut:'cts' option should discard date values`, () => {
      expect(result['1'].streams.FACE1.samples[6].date).toBeUndefined();
    });
  });

  describe('Testing with Fusion file', () => {
    slowBeforeAll(async () => {
      const filename = 'Fusion';
      await inputHandle.uploadFile(
        join(__dirname, '../../samples/', `${filename}.raw`)
      );
      result = await page.evaluate(async () =>
        GoProTelemetry(
          { rawData: await readFileAsBuffer(0) },
          { ellipsoid: true }
        )
      );
    });

    test(`ellipsoid option should give bad height (relative to sea level)`, () => {
      expect(result['1'].streams.GPS5.samples[0].value[2]).toBe(-18.524);
    });
  });

  describe('Testing joining consecutive files', () => {
    slowBeforeAll(async () => {
      const filename1 = 'consecutive1';
      const filename2 = 'consecutive2';
      const timings = JSON.parse(
        readFileSync(
          join(__dirname, `../../samples/partials/consecutiveTiming.json`)
        )
      );

      await inputHandle.evaluate(input => (input.multiple = true));
      await inputHandle.uploadFile(
        join(__dirname, '../../samples/', `${filename1}.raw`),
        join(__dirname, '../../samples/', `${filename2}.raw`)
      );

      // Make sure both files are loaded
      expect(
        await page.evaluate(
          async () => document.querySelector('[type=file]').files[0].size
        )
      ).toBe(10876);
      expect(
        await page.evaluate(
          async () => document.querySelector('[type=file]').files[1].size
        )
      ).toBe(16092);

      result = await page.evaluate(async timings => {
        timings.forEach(t => (t.start = new Date(t.start)));
        return GoProTelemetry([
          { rawData: await readFileAsBuffer(0), timing: timings[0] },
          { rawData: await readFileAsBuffer(1), timing: timings[1] }
        ]);
      }, timings);
    });

    test(`Consecutive files should add samples from two files`, () => {
      expect(result['1'].streams.ACCL.samples.length).toBe(1092);
    });

    test(`Consecutive files should keep consecutive cts times`, () => {
      expect(result['1'].streams.ACCL.samples[1091].cts).toBe(
        10751.884057971107
      );
    });

    afterAll(() => {
      inputHandle.evaluate(input => (input.multiple = true));
    });
  });

  describe('Testing reusing parsed data', () => {
    slowBeforeAll(async () => {
      const filename = 'hero6';
      await inputHandle.uploadFile(
        join(__dirname, '../../samples/', `${filename}.raw`)
      );
      result = await page.evaluate(async timing => {
        const result = [
          await GoProTelemetry({ rawData: await readFileAsBuffer(0), timing })
        ];
        //Retrieve parsed data with a bunch of options to make sure that does not change the output
        const parsedData = await GoProTelemetry(
          { rawData: await readFileAsBuffer(0), timing },
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
        result.push(await GoProTelemetry({ parsedData, timing }));
        return result;
      }, timing);
    });

    test(`Reused parsed data should output the same as binary data`, () => {
      expect(JSON.stringify(result[0])).toBe(JSON.stringify(result[1]));
    });
  });

  describe('Testing using new GPS9 stream', () => {
    slowBeforeAll(async () => {
      const filename = 'hero11';
      await inputHandle.uploadFile(
        join(__dirname, '../../samples/', `${filename}.raw`)
      );
      result = await page.evaluate(async () =>
        GoProTelemetry(
          { rawData: await readFileAsBuffer(0) },
          { stream: 'GPS' }
        ).then(result => {
          result['1'].streams.GPS9.samples[10].date =
            result['1'].streams.GPS9.samples[10].date.toISOString();
          return result;
        })
      );
    });

    test(`GPS stream of HERO11 and newer should have GPS9 timestamps`, () => {
      expect(result['1'].streams.GPS9.samples[10].date).toBe(
        '2022-09-20T13:29:37.898Z'
      );
    });

    test(`GPS stream of HERO11 and newer should have per-sample Fix data`, () => {
      expect(result['1'].streams.GPS9.samples[10].value[8]).toBe(3);
    });
  });
});

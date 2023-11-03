/// <reference types="jest" />
const { join } = require('path');

describe('Testing with mp4 header', () => {
  /** @type {import('puppeteer').ElementHandle<HTMLInputElement>} */
  let inputHandle;
  let result;
  beforeAll(async () => {
    await page.goto(`file://${join(__dirname, './index.html')}`, {
      waitUntil: 'networkidle0'
    });
    inputHandle = await page.$('input[type=file]');
    await inputHandle.uploadFile(
      join(__dirname, '../../samples/mp4header.raw')
    );
    result = await page.evaluate(async () =>
      GoProTelemetry(
        { rawData: await readFileAsBuffer(0) },
        { mp4header: true }
      )
    );
  }, 20000);

  test(`The sample should have 3 highlight tags`, () => {
    expect(result.HLMT.streams.HLMT.samples.length).toBe(3);
  });

  test(`The firmware version should be readable`, () => {
    expect(result[1].streams['Data 0'][0].FMWR).toBe('HD7.01.01.90.00');
  });
});

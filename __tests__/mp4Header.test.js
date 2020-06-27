const goproTelemetry = require('../');
const fs = require('fs');

let filename, file, result;

describe('Testing with mp4 header', () => {
  beforeAll(async () => {
    filename = 'mp4header';
    file = fs.readFileSync(`${__dirname}/../samples/${filename}.raw`);
    result = await goproTelemetry({ rawData: file }, { mp4header: true });
  });

  test(`The sample should have 3 highlight tags`, () => {
    expect(result.HLMT.streams.HLMT.samples.length).toBe(3);
  });

  test(`The firmware version should be readable`, () => {
    expect(result[1].streams['Data 0'][0].FMWR).toBe('HD7.01.01.90.00');
  });
});

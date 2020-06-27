const mergeStream = require('../code/mergeStream');
const { readFileSync } = require('fs');

let result;

describe('Test merging', () => {
  beforeAll(async () => {
    const file = readFileSync(`${__dirname}/../samples/partials/timed.json`);
    result = await mergeStream(JSON.parse(file)['1'], {
      stream: 'ACCL'
    });
  });

  test(`mergeStream should merge and name strams`, () => {
    expect(result.streams.ACCL.name).toBe('Accelerometer (z,x,y)');
  });
});

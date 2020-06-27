const toVirb = require('../code/toVirb');
const { readFileSync } = require('fs');

let result;

describe('Test GPS5', () => {
  beforeAll(async () => {
    const file = readFileSync(
      `${__dirname}/../samples/partials/mergedGps.json`
    );

    result = await toVirb(JSON.parse(file), { stream: ['GPS5'] });
  });

  test(`toVirb should return a long string`, () => {
    expect(result.length).toBeGreaterThan(6000);
  });

  test(`toVirb should start with xml- (virb) format`, () => {
    expect(result.slice(453, 1023).replace(/\s/g, '').trim()).toBe(
      `<src>Camera</src><trkseg><trkptlat=\"33.1264969\"lon=\"-117.3273542\"><ele>-20.184</ele><time>2017-04-17T17:31:03.000Z</time><geoidheight>-34.03217630752571</geoidheight><extensions><gpxtpx:TrackPointExtension><gpxtpx:speed>0.19</gpxtpx:speed></gpxtpx:TrackPointExtension></extensions></trkpt><trkptlat=\"33.1264969\"lon=\"-117.3273541\"><ele>-20.146</ele>`
    );
  });
});

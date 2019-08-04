const toGpx = require('../code/toGpx');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/mergedGps.json`);
const result = toGpx(JSON.parse(file), {});

test(`toGpx should return a long string`, () => {
  expect(result.length).toBeGreaterThan(6000);
});

test(`toGpx should start with xml-gpx format`, () => {
  expect(
    result
      .slice(370, 950)
      .replace(/\s/g, '')
      .trim()
  ).toBe(
    `<src>Camera</src><trkseg><trkptlat=\"33.1264969\"lon=\"-117.3273542\"><ele>-20.184</ele><time>2017-04-17T17:31:03.000Z</time><fix>3</fix><hdop>606</hdop><geoidheight>-34.03217630752571</geoidheight><extensions><gpxtpx:TrackPointExtension><gpxtpx:speed>0.19</gpxtpx:speed></gpxtpx:TrackPointExtension></extensions><cmt>2dSpeed:0.167;3dSpeed:0.19</cmt>`
  );
});

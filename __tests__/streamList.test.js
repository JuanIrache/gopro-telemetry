const streamList = require('../code/streamList');
const { readFileSync } = require('fs');

const file = readFileSync(`${__dirname}/../samples/partials/parsed.json`);
const result = streamList(JSON.parse(file));

test(`streamList should return streams and their names`, () => {
  expect(result['1'].streams.WRGB).toBe('White Balance RGB gains');
});

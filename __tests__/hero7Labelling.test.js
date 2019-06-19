const hero7Labelling = require('../code/hero7Labelling');
const { knownMulti } = require('../code/keys');

const str = 'Scene classification[[CLASSIFIER_FOUR_CC,prob], ...]';
const result = hero7Labelling(str, knownMulti['SCEN']);

test(`hero7Labelling get rid of square brackets and translate ids when required`, () => {
  expect(result).toBe('Scene classification (CLASSIFIER,prob)');
});

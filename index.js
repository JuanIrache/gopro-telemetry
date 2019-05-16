const parseKLV = require('./code/parseKLV');

module.exports = function(data, options = {}) {
  return parseKLV(data, options);
};

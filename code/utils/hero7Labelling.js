const { idKeysTranslation } = require('../data/keys');

//Simplify Hero7 Labelling style
module.exports = function (str, multi) {
  const newStyle = /\[\[([\w,\s]+)\][,\s\.]*\]/;
  if (str && newStyle.test(str)) {
    const inner = str
      .match(newStyle)[1]
      .split(',')
      .map((s, i) => {
        if (i === 0 && multi) s = idKeysTranslation(s);
        return s.trim();
      })
      .join(',');
    return str.replace(newStyle, ` (${inner})`);
  }
  return str;
};

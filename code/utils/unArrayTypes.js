function replacer(whole, match0, match1) {
  let replacement = '';
  for (let i = 0; i < match1; i++) replacement += match0;
  return replacement;
}

module.exports = function(str) {
  if (/(\w)\[(\d+)\]/g.test(str)) str = str.replace(/(\w)\[(\d+)\]/g, replacer);
  return str;
};

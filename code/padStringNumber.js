module.exports = function(val, int, dec) {
  let sign = '+';
  if (val[0] === '-') {
    sign = '-';
    val = val.slice(1);
  }

  let integer = val.match(/^(\d*)/);
  if (int) {
    if (!integer || !integer.length) integer = ['0', '0'];
    let padded = integer[1].padStart(int, '0');
    val = val.replace(/^(\d*)/, padded);
  }
  let decimal = val.match(/\.(\d*)$/);
  if (dec) {
    const missingDot = !decimal || !decimal.length;
    if (missingDot) decimal = ['0', '0'];
    let padded = decimal[1].padEnd(dec, '0');
    if (missingDot) val = `${val}.${padded}`;
    else val = val.replace(/(\d*)$/, padded);
  }
  return sign + val;
};

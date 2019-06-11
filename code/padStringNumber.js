//Gets a number string and returns a string with the provided zoer-padding, left and right (only adds, does not remove)
module.exports = function(val, int, dec) {
  let sign = '+';
  if (val[0] === '-') {
    sign = '-';
    val = val.slice(1);
  }

  let integer = val.match(/^(\d*)/);
  //Add to left side if needed
  if (int) {
    if (!integer || !integer.length) integer = ['0', '0'];
    let padded = integer[1].padStart(int, '0');
    val = val.replace(/^(\d*)/, padded);
  }

  let decimal = val.match(/\.(\d*)$/);
  //Add to right side if needed
  if (dec) {
    const missingDot = !decimal || !decimal.length;
    if (missingDot) decimal = ['0', '0'];
    let padded = decimal[1].padEnd(dec, '0');
    if (missingDot) val = `${val}.${padded}`;
    else val = val.replace(/(\d*)$/, padded);
  }
  return sign + val;
};

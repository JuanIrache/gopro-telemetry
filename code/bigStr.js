//Avoid scientific notation
//https://stackoverflow.com/a/46545519
module.exports = function(num) {
  if (num != null) {
    let numStr = String(num);
    if (Math.abs(num) < 1.0) {
      let e = parseInt(num.toString().split('e-')[1]);
      if (e) {
        let negative = num < 0;
        if (negative) num *= -1;
        num *= Math.pow(10, e - 1);
        numStr = '0.' + new Array(e).join('0') + num.toString().substring(2);
        if (negative) numStr = '-' + numStr;
      }
    } else {
      let e = parseInt(num.toString().split('+')[1]);
      if (e > 20) {
        e -= 20;
        num /= Math.pow(10, e);
        numStr = num.toString() + new Array(e + 1).join('0');
      }
    }
    return numStr;
  }
  return '';
};

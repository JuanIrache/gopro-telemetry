module.exports = function (func) {
  return new Promise(function (resolve) {
    const result = func();
    resolve(result);
  });
};

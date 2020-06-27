module.exports = function (func) {
  return new Promise(function (resolve, reject) {
    try {
      const result = func();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

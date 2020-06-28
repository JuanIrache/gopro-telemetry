// Lets other processes run to avoid blocking the server or browser for too long

module.exports = function () {
  return new Promise(resolve => setImmediate(resolve));
};

// Lets other processes run to avoid blocking the server or browser for too long

const awaiter = typeof setImmediate === 'undefined' ? setTimeout : setImmediate;

/** @type {() => Promise<void>} */
module.exports = function () {
  return new Promise(resolve => awaiter(resolve));
};

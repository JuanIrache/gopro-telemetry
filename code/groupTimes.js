function mergeSamples(samples) {}

module.exports = function(samples, length) {
  let currentTime = 0;
  let result = [];
  let reachedEnd = false;
  let i = 0;
  while (!reachedEnd) {
    let group = [];
    while (samples[i].cts < currentTime + length) {
      group.push(samples[i]);
      if (i + 1 === samples.length) {
        reachedEnd = true;
        break;
      } else i++;
    }
    result.push(mergeSamples(group));
    currentTime += length;
  }
};

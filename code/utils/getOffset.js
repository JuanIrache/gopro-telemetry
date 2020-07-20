module.exports = ({ interpretedArr, i, opts, timing }) => {
  // Check time of last sample, in case videoDurations are not consistent with timing (TimeWarp)
  let reachedTime = 0;
  let dev = Object.keys(interpretedArr[i - 1])[0];
  if (dev && interpretedArr[i - 1][dev].streams) {
    const streams = Object.keys(interpretedArr[i - 1][dev].streams);
    for (const stream of streams) {
      const samples = interpretedArr[i - 1][dev].streams[stream].samples;
      if (samples && samples.length) {
        const thisCts = samples[samples.length - 1].cts;
        // Add one to avoid overlapping
        reachedTime = Math.max(thisCts + 1, reachedTime);
      }
    }
  }

  let prevDuration = timing
    .slice(0, i)
    .reduce((acc, t) => acc + (1000 * t.videoDuration || 0), 0);

  prevDuration = Math.max(reachedTime, prevDuration);

  if (opts.removeGaps) return prevDuration;
  else {
    const dateDiff = timing[i].start - timing[0].start;
    return Math.max(dateDiff, prevDuration);
  }
};

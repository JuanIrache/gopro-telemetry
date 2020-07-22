module.exports = ({ interpretedArr, initialDate }) => {
  // Preserve initial date for GPS times. Helps with Time Warp
  let dev = Object.keys(interpretedArr[0])[0];
  if (!initialDate && dev && interpretedArr[0][dev].streams) {
    const streams = Object.keys(interpretedArr[0][dev].streams);
    for (const stream of streams) {
      const samples = interpretedArr[0][dev].streams[stream].samples;
      if (samples && samples.length) {
        return samples[0].date.getTime();
      }
    }
  }
  return initialDate;
};

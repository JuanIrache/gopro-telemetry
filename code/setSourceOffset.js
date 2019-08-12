//Check that out time is before next in time, then apply offsets
module.exports = (a, b) => {
  const lastSample = a.timing.samples[a.timing.samples.length - 1];
  const lastTime = a.timing.start.getTime() + lastSample.cts + lastSample.duration;
  const nextStart = b.timing.start.getTime();
  if (nextStart - lastTime < 0) throw new Error('Sources overlap in time. Cannot merge');
  const firstCts = a.timing.samples[0].cts;
  const firstStart = a.timing.start.getTime();
  const offset = firstCts + nextStart - firstStart;
  b.timing.samples = b.timing.samples.map(s => ({ ...s, cts: s.cts + offset }));
};

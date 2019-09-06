//Check that out time is before next in time, then apply offsets
module.exports = (a, b) => {
  const lastSample = a.samples[a.samples.length - 1];
  const lastTime = a.start.getTime() + lastSample.cts;
  const nextStart = b.start.getTime();
  if (nextStart - lastTime < 0) throw new Error('Sources overlap in time. Cannot merge');
  const firstCts = a.samples[0].cts;
  const firstStart = a.start.getTime();
  b.offset = firstCts + nextStart - firstStart;
  b.samples = b.samples.map(s => ({ ...s, cts: s.cts + b.offset }));
};

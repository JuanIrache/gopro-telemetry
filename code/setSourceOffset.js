//Check that out time is before next in time, then apply offsets
module.exports = (a, b) => {
  const nextStart = b.start.getTime();
  const firstCts = a.samples[0].cts;
  const firstStart = a.start.getTime();
  b.offset = firstCts + nextStart - firstStart;
  b.samples = b.samples.map(s => ({ ...s, cts: s.cts + b.offset }));
};

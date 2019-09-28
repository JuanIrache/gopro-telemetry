//Check that out time is before next in time, then apply offsets
module.exports = (a, b) => {
  const nextStart = b.start.getTime();
  const firstCts = a.samples[0].cts;
  const firstStart = a.start.getTime();
  b.offset = firstCts + nextStart - firstStart;
  const aLastSampleIndex = a.samples.length - 1;
  //Find where the first video ends
  const firstEnd =
    a.samples[aLastSampleIndex].cts +
    (a.samples[aLastSampleIndex].duration || a.samples[aLastSampleIndex - 1].duration);
  //Make sure videos are not overlapping, might involve a loss of precision.
  b.offset = Math.max(firstEnd, b.offset);

  b.samples = b.samples.map(s => ({ ...s, cts: s.cts + b.offset }));
};

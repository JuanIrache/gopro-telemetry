function timeKLV(klv, timing, options) {
  let result = JSON.parse(JSON.stringify(klv));
  if (result.DEVC && result.DEVC.length) {
    if (timing.samples) {
      result.DEVC.forEach((d, i) => {
        if (timing.samples[i] != null) {
          const { cts, duration } = timing.samples[i];
          if (d.STRM && d.STRM.length) {
            d.STRM.forEach(s => {
              if (s.interpretSamples && s[s.interpretSamples].length) {
                const sDur = duration / s[s.interpretSamples].length; //see if TSMP and //EMPT are useful here
                let scts = cts;
                s[s.interpretSamples] = s[s.interpretSamples].map(ss => {
                  const time = scts;
                  scts += sDur;
                  return { time, value: ss };
                });
              }
            });
          }
        }
      });
    }
  } else throw new Error('Invalid data, no DEVC');
  return result;
}

module.exports = timeKLV;

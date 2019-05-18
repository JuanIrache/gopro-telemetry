function mergeDEVCs(klv, options) {
  let result = { sensors: {} };
  (klv.DEVC || []).forEach(d => {
    (d.STRM || []).forEach(s => {
      if (s.interpretSamples) {
        const fourCC = s.interpretSamples;
        if (options.sensor == null || options.sensor === fourCC) {
          //TODO do something with the descprition that changes, sticky props?
          if (result.sensors[fourCC]) result.sensors[fourCC].samples.push(...s[fourCC]);
          else {
            result.sensors[fourCC] = { samples: s[fourCC] };
            delete s[fourCC];
            delete s.interpretSamples;
            for (const key in s) result.sensors[fourCC][key] = s[key];
          }
        }
      }
    });
    delete d.DVID;
    delete d.interpretSamples;
    delete d.STRM;
    for (const key in d) result[key] = d[key];
  });
  return result;
}

module.exports = mergeDEVCs;

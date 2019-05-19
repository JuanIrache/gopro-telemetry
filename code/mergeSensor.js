const translations = {
  SIUN: 'units',
  UNIT: 'units',
  STNM: 'name',
  RMRK: 'comment'
};

const ignore = ['EMPT', 'TSMP', 'TICK', 'TOCK'];

const stickyTranslations = {
  TMPC: 'temperature',
  GPSF: 'fix',
  GPSP: 'precision',
  TIMO: 'offset'
};

function deepEqual(a, b) {
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) return a === b;
  if (Object.keys(a).length !== Object.keys(b).length) return false;
  for (let i = 0; i < Object.keys(a).length; i++) if (!deepEqual(a[Object.keys(a)[i]], b[Object.keys(a)[i]])) return false;
  return true;
}

function mergeDEVCs(klv, options) {
  let result = { sensors: {} };
  (klv.DEVC || []).forEach(d => {
    let stickies = {};
    (d.STRM || []).forEach(s => {
      if (s.interpretSamples) {
        const fourCC = s.interpretSamples;
        if (options.sensor == null || options.sensor.includes(fourCC)) {
          let samples = s[fourCC];
          delete s[fourCC];
          delete s.interpretSamples;
          let sticky = {};
          let description = {};
          for (const key in s) {
            if (translations[key]) description[translations[key]] = s[key];
            //TODO, discard these keys if not used
            else if (ignore.includes(key)) description[key] = s[key];
            else sticky[stickyTranslations[key] || key] = s[key];
          }
          sticky = { ...stickies, ...sticky };
          if (options.repeatSticky) {
            samples = samples.map(s => {
              return { ...s, ...sticky };
            });
          } else if (Object.keys(sticky).length && samples.length) {
            for (let key in sticky) {
              if (!deepEqual(sticky[key], stickies[key])) {
                samples[0].sticky = samples[0].sticky || {};
                samples[0].sticky[key] = sticky[key];
              }
            }
          }
          stickies = { ...stickies, ...sticky };
          if (options.repeatHeaders) {
            let head = [];
            if (description.name) {
              let name = description.name;
              let parts = name.match(/.*\((.+?)\).*/);
              if (parts && parts.length) {
                name = name.replace(/\((.+?)\)/, '').trim();
                parts = parts[1].split(',').map(p => p.trim());
                head = parts.map(p => `${name} (${p})`);
              } else head.push(name);
            }
            let units = [];
            if (description.units) {
              if (Array.isArray(description.units)) {
                description.units.forEach((u, i) => {
                  units.push(` (${u})`);
                });
              } else units[0] = (units[0] || '') + ` (${description.units})`;
            }

            for (let i = 0; i < Math.max(head.length, units.length); i++) {
              head[i] = (head[i] || head[0] || '') + (units[i] || units[0] || '');
            }
            samples = samples.map(s => {
              if (Array.isArray(s.value)) s.value.forEach((v, i) => (s[head[i] || head[0] || i] = v));
              else if (head[0]) s[head[0]] = s.value;
              if (head.length) delete s.value;
              return s;
            });
            delete description.units;
            delete description.name;
          }
          if (result.sensors[fourCC]) result.sensors[fourCC].samples.push(...samples);
          else result.sensors[fourCC] = { samples, ...description };
        }
      }
    });
    delete d.DVID;
    delete d.interpretSamples;
    delete d.STRM;
    for (const key in d) {
      if (translations[key]) result[translations[key]] = d[key];
      else result[key] = d[key];
    }
  });
  return result;
}

module.exports = mergeDEVCs;

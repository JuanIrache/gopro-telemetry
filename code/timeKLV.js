function toDate(d) {
  let regex = /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.(\d{3})/;
  let YEAR = 1,
    MONTH = 2,
    DAY = 3,
    HOUR = 4,
    MIN = 5,
    SEC = 6,
    MIL = 7;
  let parts = d.match(regex);
  return new Date(Date.UTC('20' + parts[YEAR], parts[MONTH] - 1, parts[DAY], parts[HOUR], parts[MIN], parts[SEC], parts[MIL]));
}

function GPSUtimes(klv) {
  let res = [];
  let initialDate;
  klv.DEVC.forEach((d, i) => {
    let partialRes;
    let date;
    if (d.STRM)
      d.STRM.forEach(s => {
        if (s.GPSU != null) date = toDate(s.GPSU);
      });
    if (date) {
      if (!initialDate) initialDate = date.getTime();
      partialRes = { date };
      // Assign duration for previous pack. The last one will lack it
      if (res.length) res[res.length - 1].duration = partialRes.date - res[res.length - 1].date;
    } else if (res.length > 1) {
      res[i - 1].duration = res[i - 2].duration;
      partialRes.date = res[i - 1].date + res[i - 1].duration;
    }
    if (partialRes) {
      partialRes.cts = partialRes.date.getTime() - initialDate;
      res.push(partialRes);
    }
  });

  return res;
}

function providedTimes(klv, timing) {
  let res = [];
  if (timing.samples.length) {
    const initialDate = timing.start.getTime();
    klv.DEVC.forEach((d, i) => {
      let partialRes;
      if (timing.samples[i] != null) partialRes = JSON.parse(JSON.stringify(timing.samples[i]));
      else {
        partialRes.cts = res[i - 1].cts + res[i - 1].duration;
        //Don't assume previous duration if last pack of samples. Could be shorter
        if (i + 1 < klv.DEVC.length) partialRes.duration = res[i - 1].duration;
      }
      partialRes.date = new Date(initialDate + partialRes.cts);
      res.push(partialRes);
    });
  }

  return res;
}

function timeKLV(klv, timing, options) {
  let result = JSON.parse(JSON.stringify(klv));
  if (result.DEVC && result.DEVC.length) {
    const gpsTimes = GPSUtimes(klv);
    const pTimes = providedTimes(klv, timing);
    result.DEVC.forEach((d, i) => {
      let cts, duration;
      if (pTimes.length) {
        cts = pTimes[i].cts;
        duration = pTimes[i].duration;
      } else if (gpsTimes.length) {
        cts = gpsTimes[i].cts;
        duration = gpsTimes[i].duration;
      }
      if (d.STRM && d.STRM.length) {
        d.STRM.forEach(s => {
          if (s.interpretSamples && s[s.interpretSamples].length) {
            const sDur = duration / s[s.interpretSamples].length; //see if TSMP and //EMPT are useful here
            let sCts = cts;
            s[s.interpretSamples] = s[s.interpretSamples].map(ss => {
              if (cts != null) {
                const time = sCts;
                sCts += sDur;
                return { time, value: ss };
              } else return { value: ss };
            });
          }
        });
      }
    });
  } else throw new Error('Invalid data, no DEVC');
  return result;
}

module.exports = timeKLV;

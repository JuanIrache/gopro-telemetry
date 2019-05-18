let GPSUPresent, timingPresent;

function toDate(d) {
  //source https://stackoverflow.com/posts/44298522/revisions
  let regex = /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.(\d{3})/;
  let YEAR = 1,
    MONTH = 2,
    DAY = 3,
    HOUR = 4,
    MIN = 5,
    SEC = 6,
    MIL = 7;
  let parts = d.match(regex);
  return new Date(`20${parts[YEAR]}-${parts[MONTH]}-${parts[DAY]} ${parts[HOUR]}:${parts[MIN]}:${parts[SEC]}.${parts[MIL]}`);
}

function GPSUtimes(klv) {
  let res = [];
  let initialDate;
  if (klv.DEVC && klv.DEVC.length) {
    klv.DEVC.forEach((d, i) => {
      let partialRes;
      let found;
      if (d.STRM && d.STRM.length) {
        d.STRM.forEach(s => {
          if (s.GPSU != null) {
            found = true;
            if (!initialDate) {
              GPSUPresent = true;
              initialDate = toDate(s.GPSU).getTime();
            }
            partialRes = { date: toDate(s.GPSU) };
            if (res.length) {
              res[res.length - 1].duration = partialRes.date - res[res.length - 1].date;
              if (i + 1 === klv.DEVC.length) partialRes.duration = res[res.length - 1].duration;
            }
          }
        });
      }
      if (GPSUPresent && !found) {
        partialRes.duration = res[i - 1].duration;
        partialRes.date = res[i - 1].date + res[i - 1].duration;
      }
      partialRes.cts = partialRes.date.getTime() - initialDate;
      res.push(partialRes);
    });
  }
  console.log(res);

  return res;
}

function providedTimes(klv, timing) {
  let res = [];
  if (timing.samples.length) {
    const initialDate = timing.start.getTime();
    if (klv.DEVC && klv.DEVC.length) {
      klv.DEVC.forEach((d, i) => {
        let partialRes;
        if (timing.samples[i] != null) {
          timingPresent = true;
          partialRes = JSON.parse(JSON.stringify(timing.samples[i]));
        } else {
          partialRes.duration = res[i - 1].duration;
          partialRes.cts = res[i - 1].cts + res[i - 1].duration;
        }
        partialRes.date = new Date(initialDate + partialRes.cts);
        res.push(partialRes);
      });
    }
  }

  return res;
}

function timeKLV(klv, timing, options) {
  const gpsTimes = GPSUtimes(klv);
  const pTimes = providedTimes(klv, timing);
  let result = JSON.parse(JSON.stringify(klv));
  if (result.DEVC && result.DEVC.length) {
    result.DEVC.forEach((d, i) => {
      let cts, duration;
      if (timingPresent) {
        cts = pTimes[i].cts;
        duration = pTimes[i].duration;
      } else if (GPSUPresent) {
        cts = gpsTimes[i].cts;
        duration = gpsTimes[i].duration;
      }
      if (d.STRM && d.STRM.length) {
        d.STRM.forEach(s => {
          if (s.interpretSamples && s[s.interpretSamples].length) {
            const sDur = duration / s[s.interpretSamples].length; //see if TSMP and //EMPT are useful here
            let sCts = cts;
            s[s.interpretSamples] = s[s.interpretSamples].map(ss => {
              const time = sCts;
              sCts += sDur;
              return { time, value: ss };
            });
          }
        });
      }
    });
  } else throw new Error('Invalid data, no DEVC');
  return result;
}

module.exports = timeKLV;

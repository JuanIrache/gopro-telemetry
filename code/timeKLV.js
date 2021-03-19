const breathe = require('./utils/breathe');

//Parse GPSU date format
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
  if (parts)
    return new Date(
      Date.UTC(
        '20' + parts[YEAR],
        parts[MONTH] - 1,
        parts[DAY],
        parts[HOUR],
        parts[MIN],
        parts[SEC],
        parts[MIL]
      )
    ).getTime();
  return null;
}

//Create list of GPS dates, times and duration for each packet of samples
async function fillGPSTime(klv, options, timeMeta) {
  let { gpsDate } = timeMeta;
  let res = [];
  //Ignore if timeIn selects the other time input
  if (options.timeIn === 'MP4' || options.mp4header) return res;
  let missingDates = [];

  klv.DEVC.forEach((d, i) => {
    //Object with partial result
    let partialRes;
    let date;
    //Loop strams if present
    if (d != null && d.STRM && d.STRM.length) {
      for (const key in d.STRM) {
        //Find the GPSU date in the GPS5 stream
        if (d.STRM[key].GPSU != null) {
          date = toDate(d.STRM[key].GPSU);
          //Done with GPSU
          if (
            (options.stream && !options.stream.includes('GPS5')) ||
            d.STRM[key].toDelete
          ) {
            delete d.STRM[key];
          } else delete d.STRM[key].GPSU;
          break;
        }
      }
    }

    if (date != null) {
      if (gpsDate == null) {
        gpsDate = date;
        // Save initial date for future use
        timeMeta.gpsDate = gpsDate;
      }
      partialRes = { date };
      // Assign duration for previous pack. The last one will lack it
      if (res.length && res[res.length - 1] && res[res.length - 1].date) {
        res[res.length - 1].duration =
          partialRes.date - res[res.length - 1].date;
      }
    }

    if (partialRes) {
      //Deduce starting time from date and push result
      partialRes.cts = partialRes.date - gpsDate;
      res.push(partialRes);
    } else {
      res.push(null);
      missingDates.push(i);
    }
  });

  let missingDurations = [];

  //Deduce null results as accurately as possible
  missingDates.forEach(i => {
    //If a previous date is present
    if (res[i] === null && res[i - 1] && res[i - 1].date) {
      let foundNext = false;
      for (let x = 1; i + x < res.length; x++) {
        // Look for the next valild date
        if (res[i + x] && res[i + x].date) {
          //And interpolate to find the previous one
          res[i - 1].duration = (res[i + x].date - res[i - 1].date) / x;
          //Duration set, remove from missingDurations
          const index = missingDurations.indexOf(i - 1);
          if (index !== -1) missingDurations.splice(index, 1);
          foundNext = true;
          break;
        }
      }

      if (!foundNext) {
        //If no date but previous packets have one, deduce from them. 1Hz as fallback
        let lastDuration = 1000;
        for (let j = i - 2; j >= 0; j--) {
          if (res[j] && res[j].duration) {
            lastDuration = res[j].duration;
            break;
          }
        }
        res[i - 1].duration = lastDuration;
      }
      if (res[i - 1].duration != null) {
        // Deduce date and starting time form previous date and duration
        res[i] = { date: res[i - 1].date + res[i - 1].duration };
        res[i].cts = res[i].date - gpsDate;
        missingDurations.push(i);
      }
    }
  });

  // Fill initial, non fixed dates
  let lastMissing = -1;
  while (res[lastMissing + 1] == null && lastMissing < res.length)
    lastMissing++;
  if (lastMissing >= 0 && res.length > lastMissing + 2) {
    const avgDuration =
      (res.slice(-1)[0].date - res[lastMissing + 1].date) /
      (res.length - (lastMissing + 1));
    while (lastMissing >= 0) {
      const nextGood = res[lastMissing + 1];
      res[lastMissing] = {
        date: nextGood.date - avgDuration,
        cts: nextGood.cts - avgDuration,
        duration: avgDuration
      };
      lastMissing--;
    }
  }

  // Fix negative CTS
  if (res[0] && res[0].cts < 0)
    res = res.map(r => ({ ...r, cts: r.cts - res[0].cts }));

  //Fill missing durations
  missingDurations.forEach(i => {
    if (res[i + 1] && res[i + 1].date)
      res[i].duration = res[i + 1].date - res[i].date;
  });

  //If only one group of samples, invent duration to get at least some useful results
  if (res.length === 1 && res[0] != null && res[0].duration == null)
    res[0].duration = 1001;

  return res;
}

//Create date, time, duration list based on mp4 date and timing data
async function fillMP4Time(klv, timing, options, timeMeta) {
  let { offset, mp4Date } = timeMeta;
  if (!offset) offset = 0;
  let res = [];
  //Ignore if timeIn selects the other time input
  if (options.timeIn === 'GPS' || options.mp4header) return res;
  //Invent timing data if missing
  if (!timing || !timing.samples || !timing.samples.length) {
    timing = {
      frameDuration: 0.03336666666666667,
      start: new Date(),
      samples: [{ cts: 0, duration: 1001 }]
    };
  }

  //Set the initial date, the only one provided by mp4
  if (typeof timing.start != 'object') timing.start = new Date(timing.start);

  if (!mp4Date) {
    mp4Date = timing.start.getTime();
    timeMeta.mp4Date = mp4Date;
  }
  klv.DEVC.forEach((d, i) => {
    //Will contain the timing data about the packet
    let partialRes = {};
    //Copy cts and duration from mp4 if present
    if (timing.samples[i] != null) {
      partialRes = JSON.parse(JSON.stringify(timing.samples[i]));
      // Add offset if merging clips
      if (offset) partialRes.cts += offset;
    } else {
      //Deduce it from previous sample
      partialRes.cts = res[i - 1].cts + (res[i - 1].duration || 0);
      //Don't assume previous duration if last pack of samples. Could be shorter
      if (i + 1 < klv.DEVC.length) {
        if (res[i - 1].duration) partialRes.duration = res[i - 1].duration;
        else if (i > 1 && res[i - 2].duration) {
          partialRes.duration = res[i - 2].duration;
        }
      }
    }

    //Deduce the date by adding the starting time to the initial date, and push
    partialRes.date = mp4Date + partialRes.cts;

    res.push(partialRes);
    //Delete GPSU
    if (d != null && d.STRM && d.STRM.length) {
      for (const key in d.STRM) {
        //Find the GPSU date in the GPS5 stream
        if (d.STRM[key].GPSU != null) {
          //Done with GPSU
          if (
            (options.stream && !options.stream.includes('GPS5')) ||
            d.STRM[key].toDelete
          ) {
            delete d.STRM[key];
          } else delete d.STRM[key].GPSU;
          break;
        }
      }
    }
  });

  return res;
}

//Assign time data to each sample
async function timeKLV(klv, timing, options, timeMeta = {}) {
  let { offset } = timeMeta;
  if (!offset) offset = 0;
  //Copy the klv data
  let result;
  try {
    result = JSON.parse(JSON.stringify(klv));
  } catch (error) {
    result = klv;
  }
  try {
    //If valid data
    if (result.DEVC && result.DEVC.length) {
      //Gather and deduce both types of timing info
      const gpsTimes = await fillGPSTime(result, options, timeMeta);
      const mp4Times = await fillMP4Time(result, timing, options, timeMeta);

      //Will remember the duration of samples per (fourCC) type of stream, in case the last durations are missing
      let sDuration = {};
      let dateSDur = {};

      //Loop through packets of samples
      for (let i = 0; i < result.DEVC.length; i++) {
        await breathe();
        const d = result.DEVC[i];
        //Choose timing type for time (relative to the video start) data.
        const { cts, duration } = (() => {
          if (mp4Times.length && mp4Times[i] != null) return mp4Times[i];
          else if (gpsTimes.length && gpsTimes[i] != null) return gpsTimes[i];
          return { cts: null, duration: null };
        })();
        //Choose timing type for dates (ideally based on GPS).
        const { date, duration: dateDur } = (() => {
          if (gpsTimes.length && gpsTimes[i] != null) return gpsTimes[i];
          else if (mp4Times.length && mp4Times[i] != null) return mp4Times[i];
          return { date: null, duration: null };
        })();
        //Choose initial date in case it's necessary
        const dInitialDate = (() => {
          if (gpsTimes.length && timeMeta.gpsDate) return timeMeta.gpsDate;
          if (mp4Times.length && timeMeta.mp4Date) return timeMeta.mp4Date;
          return 0;
        })();

        //Create empty stream if needed for timing purposes
        const dummyStream = {
          STNM: 'UTC date/time',
          interpretSamples: 'dateStream',
          dateStream: ['0']
        };

        if (d.STRM && options.dateStream) d.STRM.push(dummyStream);

        // Only use STMP when clearly one file or consecutive files
        let skipSTMP = false;

        //Loop streams if present
        (d.STRM || []).forEach((s, ii) => {
          //If group of samples found
          if (
            s.interpretSamples &&
            s[s.interpretSamples] &&
            s[s.interpretSamples].length
          ) {
            const fourCC = s.interpretSamples;

            if (!options.mp4header) {
              //Will store the current Cts
              let currCts;
              let currDate;

              if (ii === 0) {
                // Evaluate convenience of STMP on first sample
                // Only use timestamps if not removing gap
                if (options.removeGaps) skipSTMP = true;
                // If no mp4Times, don't bother
                else if (!mp4Times.length) skipSTMP = true;
                // Arbitrarily, anything outside 2 seconds from the current offset should not use STMP either
                else if (s.STMP / 1000 > mp4Times[i].cts + 1000 * 2) {
                  skipSTMP = true;
                }
                // (It's either a non-initial isolated file or a file not directly consecutive in the series)
                else if (s.STMP / 1000 < mp4Times[i].cts - 1000 * 2) {
                  skipSTMP = true;
                }
              }

              //Use sDuration and cts from microsecond timestamps if available
              let microCts = false;
              let microDuration = false;
              let microDate = false;
              let microDateDuration = false;
              if (s.STMP != null) {
                if (!skipSTMP) {
                  currCts = s.STMP / 1000;
                  if (options.timeIn === 'MP4') {
                    //Use timeStamps for date if MP4 timing is selected
                    currDate = dInitialDate + currCts;
                    microDate = true;
                  }
                  microCts = true;
                  //Look for next sample of same fourCC
                  if (result.DEVC[i + 1]) {
                    //If next DEVC entry
                    (result.DEVC[i + 1].STRM || []).forEach(ss => {
                      //Look in each stream
                      if (ss.interpretSamples === fourCC) {
                        //Found matchin sample
                        if (ss.STMP) {
                          //Has timestamp? Measure duration of all samples and divide by number of samples
                          sDuration[fourCC] =
                            (ss.STMP / 1000 - currCts) / s[fourCC].length;
                          microDuration = true;
                          if (options.timeIn === 'MP4') {
                            //Use timeStamps for date if MP4 timing is selected
                            dateSDur[fourCC] = sDuration[fourCC];
                            microDateDuration = true;
                          }
                        }
                      }
                    });
                  }
                }
                delete s.STMP;
              }

              //Divide duration of packet by samples in packet to get sample duration per fourCC type
              if (!microDuration && duration != null) {
                sDuration[fourCC] = duration / s[fourCC].length;
              }
              if (!microCts) currCts = cts;

              //The same for duration of dates
              if (!microDateDuration && dateDur != null) {
                dateSDur[fourCC] = dateDur / s[fourCC].length;
              }
              //We know the time and date of the first sample
              if (!microDate) currDate = date;

              //Try to compensate delayed samples proportionally
              let timoDur = 0;
              if (s.TIMO) {
                //Substract time offset, but don't go under 0
                if (s.TIMO * 1000 > currCts) s.TIMO = currCts / 100;
                currCts -= s.TIMO * 1000;
                if (currCts < 0) currCts = 0;
                if (d.STRM[ii + 1] && d.STRM[ii + 1].TIMO) {
                  //Find difference to next TIMO
                  const timoDiff = d.STRM[ii + 1].TIMO - s.TIMO;
                  //And calculate how much we must compensate each sample (interpolate)
                  timoDur = (100 * timoDiff) / s[fourCC].length;
                }
                //And compensate date
                currDate -= s.TIMO * 1000;
                delete s.TIMO;
              }

              //Loop samples and replace them with timed samples
              s[fourCC] = s[fourCC].map(value => {
                //If timing data avaiable
                if (currCts != null && sDuration[fourCC] != null) {
                  let timedSample = { value };
                  //Filter out if timeOut option, but keep cts if needed for merging times
                  if (options.timeOut !== 'date' || options.groupTimes)
                    timedSample.cts = currCts;
                  if (options.timeOut !== 'cts') {
                    timedSample.date = new Date(currDate);
                  }
                  //increment time and date for the next sample and compensate time offset
                  currCts += sDuration[fourCC] - timoDur;
                  currDate += dateSDur[fourCC] - timoDur;

                  return timedSample;
                  //Otherwise return value without timing data
                } else return { value };
              });
            } else {
              //If no time required just store samples in value
              s[fourCC] = s[fourCC].map(value => ({
                value
              }));
            }
          }
        });
      }
    } else throw new Error('Invalid data, no DEVC');
  } catch (error) {
    if (options.tolerant) setImmediate(() => console.error(error));
    else throw error;
  }
  return result;
}

module.exports = timeKLV;

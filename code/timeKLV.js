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
  return new Date(Date.UTC('20' + parts[YEAR], parts[MONTH] - 1, parts[DAY], parts[HOUR], parts[MIN], parts[SEC], parts[MIL]));
}

//Create list of GPS dates, times and duration for each packet of samples
function fillGPSTime(klv, options) {
  let res = [];
  //Ignore if timeIn selects the other time input
  if (options.timeIn === 'MP$') return res;
  let initialDate;
  klv.DEVC.forEach((d, i) => {
    //Object with partial result
    let partialRes;
    let date;
    //Loop strams if present
    (d.STRM || []).forEach(s => {
      //Find the GPSU date in the GPS5 stream
      if (s.GPSU != null) date = toDate(s.GPSU);
      //Done with GPSU
      delete s.GPSU; //TODO not deleting
    });
    if (date) {
      //Set date for first packet
      if (!initialDate) initialDate = date.getTime();
      partialRes = { date };
      // Assign duration for previous pack. The last one will lack it
      if (res.length) res[res.length - 1].duration = partialRes.date - res[res.length - 1].date;
    } else if (res.length > 1) {
      //If no date but previous packets have one, deduce from them
      res[i - 1].duration = res[i - 2].duration;
      partialRes.date = res[i - 1].date + res[i - 1].duration;
    }
    if (partialRes) {
      //Deduce starting time from date and push result
      partialRes.cts = partialRes.date.getTime() - initialDate;
      res.push(partialRes);
    }
  });
  return res;
}

//Create date, time, duration list based on mp4 date and timing data
function fillMP4Time(klv, timing, options) {
  let res = [];
  //Ignore if timeIn selects the other time input
  if (options.timeIn === 'GPS') return res;
  if (timing && timing.samples && timing.samples.length) {
    //Set the initial date, the only one provided by mp4
    const initialDate = timing.start.getTime();
    klv.DEVC.forEach((d, i) => {
      //Will contain the timing data about the packet
      let partialRes = {};
      //Copy cts and duration from mp4 if present
      if (timing.samples[i] != null) partialRes = JSON.parse(JSON.stringify(timing.samples[i]));
      else {
        //Deduce it from previous sample
        partialRes.cts = res[i - 1].cts + res[i - 1].duration;
        //Don't assume previous duration if last pack of samples. Could be shorter
        if (i + 1 < klv.DEVC.length) partialRes.duration = res[i - 1].duration;
      }
      //Deduce the date by adding the starting time to the initial date, and push
      partialRes.date = new Date(initialDate + partialRes.cts);
      res.push(partialRes);
    });
  }
  return res;
}

//Assign time data to each sample
function timeKLV(klv, timing, options) {
  //Copy the klv data
  let result = JSON.parse(JSON.stringify(klv));
  try {
    //If valid data
    if (result.DEVC && result.DEVC.length) {
      //Gather and deduce both types of timing info
      const gpsTimes = fillGPSTime(result, options);
      const mp4Times = fillMP4Time(result, timing, options);
      //Will remember the duration of samples per (fourCC) type of stream, in case the last durations are missing
      let sDuration = {};
      let dateSDur = {};
      //Loop through packets of samples
      result.DEVC.forEach((d, i) => {
        //Choose timing type for time (relative to the video start) data. TODO apply user preference
        const { cts, duration } = (() => {
          if (mp4Times.length) return mp4Times[i];
          else if (gpsTimes.length) return gpsTimes[i];
        })();
        //Choose timing type for dates (ideally based on GPS). TODO apply user preference
        const { date, duration: dateDur } = (() => {
          if (gpsTimes.length) return gpsTimes[i];
          else if (mp4Times.length) return mp4Times[i];
        })();
        //Loop streams if present
        (d.STRM || []).forEach(s => {
          //If group of samples found
          if (s.interpretSamples && s[s.interpretSamples].length) {
            const fourCC = s.interpretSamples;
            //Divide duration of packet by samples in packet to get sample duration per fourCC type
            if (duration != null) sDuration[fourCC] = duration / s[fourCC].length; //TODO. see if TSMP and //EMPT are useful here
            //The same for duration of dates
            if (dateDur != null) dateSDur[fourCC] = dateDur / s[fourCC].length; //TODO. see if TSMP and //EMPT are useful here
            //We know the time and date of the first sample
            let currCts = cts;
            let currDate = date;
            //Loop samples and replace them with timed samples
            s[fourCC] = s[fourCC].map(value => {
              //If timing data avaiable
              if (currCts != null && sDuration[fourCC] != null) {
                let timedSample = { value };
                //Filter out if timeOut option, but keep cts if needed for merging times
                if (options.timeOut !== 'date' || options.groupTimes) timedSample.cts = currCts;
                if (options.timeOut !== 'cts') timedSample.date = currDate;
                //increment time adn date for the next sample
                currCts += sDuration[fourCC];
                currDate = new Date(currDate.getTime() + dateSDur[fourCC]);
                return timedSample;
                //Otherwise return value without timing data
              } else return { value };
            });
          }
        });
        d['frames/second'] = 1 / timing.frameDuration;
      });
    } else throw new Error('Invalid data, no DEVC');
  } catch (error) {
    setImmediate(() => console.error(error));
  }
  return result;
}

module.exports = timeKLV;

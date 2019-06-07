const egm96 = require('egm96');

//Adapts WGS84 ellipsoid heights in GPS data to EGM96 geoid (closer to mean sea level) and filters out bad gps data
module.exports = function(klv, { ellipsoid, GPS5Precision, GPS5Fix, preset }) {
  //Set conditions to filter out GPS5 by precision and type of fix
  const approveStream = s => {
    if (GPS5Fix != null) {
      if (s.GPSF == null) return false;
      if (s.GPSF < GPS5Fix) return false;
    }
    if (GPS5Precision != null) {
      if (s.GPSP == null) return false;
      if (s.GPSP > GPS5Precision) return false;
    }
    return true;
  };

  //Copy the klv data
  let result = JSON.parse(JSON.stringify(klv));
  //Store best correction value
  let correction = {};
  //Loop through packets of samples if correction or filtering needed
  //If GPX, we need height compensation either way
  if (!ellipsoid || preset === 'gpx' || GPS5Fix != null || GPS5Precision != null) {
    (result.DEVC || []).forEach((d, i, { length }) => {
      //First loop to find a suitable value
      for (let i = d.STRM.length - 1; i >= 0; i--) {
        //Delete streams that do not pass the test
        if (d.STRM[i].GPS5 && !approveStream(d.STRM[i])) d.STRM.splice(i, 1);
        else if (
          (!ellipsoid || preset === 'gpx') &&
          d.STRM[i].GPSF != null &&
          d.STRM[i].GPSP != null &&
          d.STRM[i].GPS5[0] &&
          d.STRM[i].GPS5[0] != null
        ) {
          // Analyse quality of GPS data, and how centered in the dataset time it is
          const fixQuality = d.STRM[i].GPSF / 3;
          const precision = (9999 - d.STRM[i].GPSP) / 9999;
          const centered = (length / 2 - Math.abs(length / 2 - i)) / (length / 2);
          //Arbitrary weight for each factor
          const rating = fixQuality * 10 + precision * 20 + centered;
          //Pick the best quality correction data
          if (correction.rating == null || rating > correction.rating) {
            //Use latitude and longitude to find the altitude offset in this location
            correction.rating = rating;
            const scaling = d.STRM[i].SCAL && d.STRM[i].SCAL.length > 1 ? [d.STRM[i].SCAL[0], d.STRM[i].SCAL[1]] : [1, 1];
            correction.source = [d.STRM[i].GPS5[0][0] / scaling[0], d.STRM[i].GPS5[0][1] / scaling[1]];
          }
        }
      }
    });
    if (correction.source) correction.value = egm96(correction.source[0], correction.source[1]);
  }

  if (correction.value != null) {
    //Loop streams to make the height adjustments
    (result.DEVC || []).forEach(d => {
      (d.STRM || []).forEach(s => {
        //Find GPS data
        if (s.GPS5) {
          if (!ellipsoid) s.altitudeFix = correction.value;
          else s.geoidheight = correction.value;
        }
      });
    });
  }
  return result;
};

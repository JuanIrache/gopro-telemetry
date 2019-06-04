const egm96 = require('egm96');

//Adapts WGS84 ellipsoid heights in GPS data to EGM96 geoid (closer to mean sea level)
module.exports = function(klv) {
  //Copy the klv data
  let result = JSON.parse(JSON.stringify(klv));
  //Loop through packets of samples
  let correction = {};
  (result.DEVC || []).forEach((d, i, { length }) => {
    //First loop to find a suitable value
    if (d.STRM) {
      for (const elt of d.STRM) {
        if (elt.GPSF != null && elt.GPSP != null && elt.GPS5[0] && elt.GPS5[0].value != null) {
          // Analyse quality of GPS data, and how centered in the dataset time it is
          const fixQuality = elt.GPSF / 3;
          const precision = (9999 - elt.GPSP) / 9999;
          const centered = (length / 2 - Math.abs(length / 2 - i)) / (length / 2);
          //Arbitrary weight for each factor
          const rating = fixQuality * 10 + precision * 20 + centered;
          //Pick the best quality correction data
          if (correction.rating == null || rating > correction.rating) {
            //Use latitude and longitude to find the altitude offset in this location
            correction.rating = rating;
            correction.source = [elt.GPS5[0].value[0], elt.GPS5[0].value[1]];
          }
        }
      }
    }

    //Loop streams to make the adjusments if all ok
    if (correction.source) {
      correction.value = egm96(correction.source[0], correction.source[1]);
      (d.STRM || []).forEach(s => {
        if (s.GPS5) {
          //Find GPS data
          s.GPS5 = s.GPS5.map(g => {
            //Apply correction
            if (g.value && g.value.length) g.value[2] = g.value[2] - correction.value;
            return g;
          });
        }
      });
    }
  });
  return result;
};

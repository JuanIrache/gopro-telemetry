const egm96 = require('egm96');

//Adapts WGS84 ellipsoid heights in GPS data to EGM96 geoid (closer to mean sea level)
module.exports = function(klv) {
  //Copy the klv data
  let result = JSON.parse(JSON.stringify(klv));
  //Loop through packets of samples
  (result.DEVC || []).forEach(d => {
    let correction;
    //First loop to find a suitable value
    if (d.STRM) {
      for (const elt of d.STRM) {
        //Arbitrary values to identify acceptable location
        if (elt.GPSF >= 2 && elt.GPSP < 1000 && elt.GPSP && elt.GPS5[0] && elt.GPS5[0].value) {
          //Use latitude and longitude to find the altitude offset in this location
          correction = egm96(elt.GPS5[0].value[0], elt.GPS5[0].value[1]);
          break;
        }
      }
    }

    //Loop streams to make the adjusments if all ok
    if (correction != null) {
      (d.STRM || []).forEach(s => {
        if (s.GPS5) {
          //Find GPS data
          s.GPS5 = s.GPS5.map(g => {
            //Apply correction
            if (g.value && g.value.length) g.value[2] = g.value[2] - correction;
            return g;
          });
        }
      });
    }
  });
  return result;
};

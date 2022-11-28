const egm96 = require('egm96-universal');
const breathe = require('./utils/breathe');

//Adapts WGS84 ellipsoid heights in GPS data to EGM96 geoid (closer to mean sea level) and filters out bad gps data
module.exports = async function (
  klv,
  { ellipsoid, GPSPrecision, GPSFix, geoidHeight },
  gpsTimeSrc
) {
  //Set conditions to filter out GPS5 by precision and type of fix
  const approveStream = s => {
    const fix = s.GPS5 ? s.GPSF : ((s.GPS9 || [])[0] || [])[8];
    const precision = s.GPS5 ? s.GPSP : 100 * ((s.GPS9 || [])[0] || [])[7];
    if (GPSFix != null) {
      if (fix == null || fix < GPSFix) return false;
    }
    if (GPSPrecision != null) {
      if (precision == null || precision > GPSPrecision) return false;
    }
    return true;
  };

  //Copy the klv data
  let result;
  try {
    result = JSON.parse(JSON.stringify(klv));
  } catch (error) {
    result = klv;
  }
  //Store best correction value
  let correction = {};
  //Loop through packets of samples if correction or filtering needed
  //If GPX, we need height compensation either way
  if (!ellipsoid || geoidHeight || GPSFix != null || GPSPrecision != null) {
    for (const d of result.DEVC || []) {
      const length = result.DEVC.length;
      // Only look for correction data if not found in this DEVC (on GPS5 instead of GPS9) but keep looking on other DEVCs
      let foundCorrection;
      //First loop to find a suitable value
      for (let i = ((d || {}).STRM || []).length - 1; i >= 0; i--) {
        await breathe();
        //Mark for deletion streams that do not pass the test, but keep them for possible timing
        if (d.STRM[i][gpsTimeSrc] && !approveStream(d.STRM[i])) {
          d.STRM[i].toDelete = true;
        } else if (
          !foundCorrection &&
          //If altitude is mean sea level, no need to process it further
          //Otherwise check if all needed info is available
          d.STRM[i].GPSA !== 'MSLV' &&
          (!ellipsoid || geoidHeight) &&
          // Do keep GPS5 and GPS9 here, as we want to correct both, if present
          // Todo, but maybe not if use stream option is otherwise?
          (d.STRM[i].GPS5 || d.STRM[i].GPS9) &&
          (d.STRM[i].GPS5 || d.STRM[i].GPS9)[0] != null
        ) {
          // Analyse quality of GPS data, and how centered in the dataset time it is
          let fixQuality, precision;
          if (
            d.STRM[i].GPS5 &&
            d.STRM[i].GPSF != null &&
            d.STRM[i].GPSP != null
          ) {
            fixQuality = d.STRM[i].GPSF / 3;
            precision = (9999 - d.STRM[i].GPSP) / 9999;
          } else if (d.STRM[i].GPS9) {
            fixQuality = d.STRM[i].GPS9[0][8] / 3;
            precision = (9999 - 100 * d.STRM[i].GPS9[0][7]) / 9999;
          } else continue;
          const centered =
            (length / 2 - Math.abs(length / 2 - i)) / (length / 2);
          //Arbitrary weight for each factor
          const rating = fixQuality * 10 + precision * 20 + centered;
          //Pick the best quality correction data
          if (correction.rating == null || rating > correction.rating) {
            //Use latitude and longitude to find the altitude offset in this location
            correction.rating = rating;
            const scaling =
              d.STRM[i].SCAL && d.STRM[i].SCAL.length > 1
                ? [d.STRM[i].SCAL[0], d.STRM[i].SCAL[1]]
                : [1, 1];
            const GPS = d.STRM[i].GPS5 || d.STRM[i].GPS9;
            correction.source = [
              GPS[0][0] / scaling[0],
              GPS[0][1] / scaling[1]
            ];
            foundCorrection = true;
          }
        }
      }
    }
    if (correction.source) {
      correction.value = egm96.meanSeaLevel(
        correction.source[0],
        correction.source[1]
      );
    }
  }

  if (correction.value != null) {
    //Loop streams to make the height adjustments
    (result.DEVC || []).forEach(d => {
      ((d || {}).STRM || []).forEach(s => {
        //Find GPS data
        if (s.GPS5 || s.GPS9) {
          if (!ellipsoid) s.altitudeFix = correction.value;
          else s.geoidHeight = correction.value;
        }
      });
    });
  }
  return result;
};

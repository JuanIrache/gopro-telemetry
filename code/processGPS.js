const egm96 = require('egm96-universal');
const breathe = require('./utils/breathe');

//Adapts WGS84 ellipsoid heights in GPS data to EGM96 geoid (closer to mean sea level) and filters out bad gps data
module.exports = async function (
  klv,
  { ellipsoid, GPSPrecision, GPSFix, geoidHeight },
  gpsTimeSrc
) {
  //Set conditions to filter out GPS5 by precision and type of fix
  const evaluateDeletion = s => {
    if (s.GPS5) {
      if (GPSFix != null && (s.GPSF == null || s.GPSF < GPSFix)) {
        return 'all';
      }
      if (GPSPrecision != null && (s.GPSP == null || s.GPSP > GPSPrecision)) {
        return 'all';
      }
      return false;
    } else if (s.GPS9) {
      let accepted = 0;
      let rejected = 0;
      const perSample = [];
      for (const sample of s.GPS9 || []) {
        const fix = sample[8];
        const precision = sample[7];
        if (GPSFix != null) {
          if (fix == null || fix < GPSFix) {
            rejected++;
            perSample.push(true);
            continue;
          }
        }
        if (GPSPrecision != null) {
          if (precision == null || precision > GPSPrecision) {
            rejected++;
            perSample.push(true);
            continue;
          }
        }
        accepted++;
        perSample.push(false);
      }
      if (rejected === s.GPS9.length) return 'all';
      if (accepted === s.GPS9.length) return false;
      return perSample;
    }
  };

  //Copy the klv data
  let result;
  try {
    result = JSON.parse(JSON.stringify(klv));
  } catch (error) {
    result = klv;
  }
  //Store best correction value
  const corrections = {};
  //Loop through packets of samples if correction or filtering needed
  //If GPX, we need height compensation either way
  if (!ellipsoid || geoidHeight || GPSFix != null || GPSPrecision != null) {
    for (const d of result.DEVC || []) {
      const length = result.DEVC.length;
      // Only look for correction data if not found in this DEVC (on GPS5 instead of GPS9) but keep looking on other DEVCs
      const foundCorrections = {};
      //First loop to find a suitable value
      for (let i = ((d || {}).STRM || []).length - 1; i >= 0; i--) {
        await breathe();
        //Mark for deletion streams that do not pass the test, but keep them for possible timing
        const toDelete = d.STRM[i][gpsTimeSrc] && evaluateDeletion(d.STRM[i]);
        if (toDelete) d.STRM[i].toDelete = toDelete;
        else if (
          (!foundCorrections.GPS5 || foundCorrections.GPS9) &&
          //If altitude is mean sea level, no need to process it further
          //Otherwise check if all needed info is available
          d.STRM[i].GPSA !== 'MSLV' &&
          (!ellipsoid || geoidHeight)
        ) {
          const gpsKey = ['GPS5', 'GPS9'].find(
            k => d.STRM[i][k] && d.STRM[i][k][0] != null
          );
          if (gpsKey && !foundCorrections[gpsKey]) {
            // Do keep GPS5 and GPS9 here, as we want to correct both, if present
            // Todo, but maybe not if use stream option is otherwise? Shoulnd't the unnecessary stream have been deleted already?
            // Analyse quality of GPS data, and how centered in the dataset time it is
            let fixQuality, precision;
            if (
              gpsKey === 'GPS5' &&
              d.STRM[i].GPSF != null &&
              d.STRM[i].GPSP != null
            ) {
              fixQuality = d.STRM[i].GPSF / 3;
              precision = (9999 - d.STRM[i].GPSP) / 9999;
            } else if (gpsKey === 'GPS9') {
              fixQuality = d.STRM[i].GPS9[0][8] / 3;
              precision = (9999 - 100 * d.STRM[i].GPS9[0][7]) / 9999;
            } else continue;
            corrections[gpsKey] = corrections[gpsKey] || {};
            // Give some value to the fact a value is coming from the centre of the data
            const centered =
              (length / 2 - Math.abs(length / 2 - i)) / (length / 2);
            //Arbitrary weight for each factor
            const rating = fixQuality * 10 + precision * 20 + centered;
            //Pick the best quality correction data
            if (
              corrections[gpsKey].rating == null ||
              rating > corrections[gpsKey].rating
            ) {
              //Use latitude and longitude to find the altitude offset in this location
              corrections[gpsKey].rating = rating;
              const scaling =
                d.STRM[i].SCAL && d.STRM[i].SCAL.length > 1
                  ? [d.STRM[i].SCAL[0], d.STRM[i].SCAL[1]]
                  : [1, 1];
              corrections[gpsKey].source = [
                d.STRM[i][gpsKey][0][0] / scaling[0],
                d.STRM[i][gpsKey][0][1] / scaling[1]
              ];
              foundCorrections[gpsKey] = true;
            }
          }
        }
      }
    }
    for (const k in corrections) {
      if (corrections[k].source) {
        corrections[k].value = egm96.meanSeaLevel(
          corrections[k].source[0],
          corrections[k].source[1]
        );
      }
    }
  }

  //Loop streams to make the height adjustments
  (result.DEVC || []).forEach(d => {
    ((d || {}).STRM || []).forEach(s => {
      for (const k in corrections) {
        if (corrections[k].value != null) {
          //Find GPS data
          if (s[k]) {
            if (!ellipsoid) s.altitudeFix = corrections[k].value;
            else s.geoidHeight = corrections[k].value;
          }
        }
      }
    });
  });
  return result;
};

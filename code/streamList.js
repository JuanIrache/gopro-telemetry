const { translations } = require('./keys');

function deviceList(klv) {
  result = {};
  (klv.DEVC || []).forEach(d => {
    //Save device name to results inside device id key
    if (!result[d.DVID]) result[d.DVID] = {};
    result[d.DVID][translations.DVNM] = d.DVNM;
    result[d.DVID].streams = result[d.DVID].streams || {};
    //Add all streams to each device, except for STNM error
    (d.STRM || []).forEach(s => {
      if (s.interpretSamples && s.interpretSamples !== 'STNM')
        result[d.DVID].streams[s.interpretSamples] =
          s.STNM || s.RMRK || s.UNIT || s.SIUN || result[d.DVID].streams[s.interpretSamples] || '';
    });
  });
  return result;
}

module.exports = deviceList;

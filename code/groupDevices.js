//Groups DEVC entries by device
function groupDevices(klv, options) {
  result = {};
  (klv.DEVC || []).forEach(d => {
    //Filter out when using the device options
    if (options.device == null || options.device.includes(d.DVID)) {
      //Save to results inside device id key
      if (result[d.DVID]) result[d.DVID].DEVC.push(d);
      else result[d.DVID] = { DEVC: [d], interpretSamples: 'DEVC' };
    }
  });
  return result;
}

module.exports = groupDevices;

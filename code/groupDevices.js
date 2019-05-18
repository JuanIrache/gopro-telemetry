function groupDevices(klv, options) {
  //Todo, select which device
  result = {};
  (klv.DEVC || []).forEach(d => {
    if (options.device == null || d.DVID == options.device) {
      if (result[d.DVID]) result[d.DVID].DEVC.push(d);
      else result[d.DVID] = { DEVC: [d], interpretSamples: 'DEVC' };
    }
  });
  return result;
}

module.exports = groupDevices;

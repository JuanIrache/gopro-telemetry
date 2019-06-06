//Groups DEVC entries by device
function groupDevices(klv) {
  result = {};
  (klv.DEVC || []).forEach(d => {
    //Save to results inside device id key
    if (result[d.DVID]) result[d.DVID].DEVC.push(d);
    else result[d.DVID] = { DEVC: [d], interpretSamples: 'DEVC' };
  });
  return result;
}

module.exports = groupDevices;

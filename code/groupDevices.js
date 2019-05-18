function groupDevices(klv, options) {
  //Todo, select which device
  result = {};
  (klv.DEVC || []).forEach(d => {
    if (result[d.DVID]) result[d.DVID].DEVC.push(d);
    else result[d.DVID] = { DEVC: [d] };
  });
  return result;
}

module.exports = groupDevices;

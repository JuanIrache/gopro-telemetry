function deviceList(klv) {
  result = {};
  (klv.DEVC || []).forEach(d => {
    //Save device name to results inside device id key
    result[d.DVID] = d.DVNM;
  });
  return result;
}

module.exports = deviceList;

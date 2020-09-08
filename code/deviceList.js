function deviceList(klv) {
  result = {};
  (klv.DEVC || [])
    .filter(d => d != null)
    .forEach(d => {
      //Save device name to results inside device id key
      result[d.DVID] = d.DVNM;
    });
  return result;
}

module.exports = deviceList;

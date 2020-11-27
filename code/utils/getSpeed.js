const degToRad = d => (d * Math.PI) / 180;

const coordsToDist = (lat2, lon2, lat1, lon1) => {
  const earthRadius = 6378137;

  const dLat = degToRad(lat2 - lat1);
  const dLon = degToRad(lon2 - lon1);

  lat1 = degToRad(lat1);
  lat2 = degToRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
};

module.exports = (from, to) => {
  if (!from) return 0;
  const t1 = from.date / 1000;
  const t2 = to.date / 1000;
  if (!from.value || !to.value) return null;
  const [lat1, lon1, ele1] = from.value;
  const [lat2, lon2, ele2] = to.value;

  const duration = t2 - t1;
  const distance = coordsToDist(lat2, lon2, lat1, lon1);

  const vertDist = ele2 - ele1;
  const distance3d = Math.sqrt(vertDist ** 2 + distance ** 2);
  return distance3d / duration;
};

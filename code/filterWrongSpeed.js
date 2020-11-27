const getSpeed = require('./utils/getSpeed');

module.exports = (samples, maxSpeed) => {
  const tracks = [];
  // km/h to m/s
  for (const sample of samples) {
    let destination = { track: null, speed: maxSpeed };
    for (let i = 0; i < tracks.length; i++) {
      // Calc speed to last of track
      const lastSample = tracks[i][tracks[i].length - 1];
      const speed = getSpeed(lastSample, sample);
      if (speed != null && speed < destination.speed) {
        destination = { track: i, speed };
      }
    }
    if (destination.track == null) tracks.push([sample]);
    else tracks[destination.track].push(sample);
  }
  return tracks.reduce(
    (best, track) => (track.length > best.length ? track : best),
    []
  );
};

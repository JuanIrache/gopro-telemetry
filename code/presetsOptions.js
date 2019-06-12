//Forces a series of options when using these presets
module.exports = {
  general: { mandatory: { deviceList: false, streamList: false, raw: false, repeatSticky: false, repeatHeaders: false }, preferred: {} },
  //geoidheight saves the altitude offset when ellipsoid is enabled, for 3d party interpretation
  gpx: { mandatory: { dateStream: false, stream: 'GPS5', timeOut: 'date', geoidHeight: true }, preferred: { ellipsoid: true } },
  kml: { mandatory: { dateStream: false, stream: 'GPS5', timeOut: 'date' }, preferred: {} },
  geojson: { mandatory: { dateStream: false, stream: 'GPS5', timeOut: null, geoidHeight: true }, preferred: { ellipsoid: true } },
  csv: { mandatory: { dateStream: false }, preferred: {} },
  mgjson: { mandatory: { dateStream: true }, preferred: { groupTimes: 'frames' } }
};

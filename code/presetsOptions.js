//Forces a series of options when using these presets
module.exports = {
  general: { mandatory: { deviceList: false, streamList: false, raw: false, repeatSticky: false, repeatHeaders: false }, preferred: {} },
  //geoidheight saves the altitude offset when ellipsoid is enabled, for 3d party interpretation
  gpx: { mandatory: { stream: 'GPS5', timeOut: 'date', geoidHeight: true }, preferred: { ellipsoid: true } },
  kml: { mandatory: { stream: 'GPS5', timeOut: 'date' }, preferred: {} },
  geojson: { mandatory: { stream: 'GPS5', timeOut: null }, preferred: { ellipsoid: true } }
};

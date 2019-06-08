//Forces a series of options when using these presets
module.exports = {
  general: { mandatory: { deviceList: false, streamList: false, raw: false, repeatSticky: false, repeatHeaders: false }, preferred: {} },
  gpx: { mandatory: { stream: 'GPS5', timeOut: 'date' }, preferred: { ellipsoid: true } },
  kml: { mandatory: { stream: 'GPS5', timeOut: 'date' }, preferred: {} },
  geojson: { mandatory: { stream: 'GPS5', timeOut: null }, preferred: { ellipsoid: true } }
};

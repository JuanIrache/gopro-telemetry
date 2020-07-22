//Forces a series of options when using these presets
module.exports = {
  general: {
    mandatory: {
      deviceList: false,
      streamList: false,
      raw: false,
      repeatSticky: false,
      repeatHeaders: false
    },
    preferred: {}
  },
  //geoidheight saves the altitude offset when ellipsoid is enabled, for 3d party interpretation
  gpx: {
    mandatory: {
      dateStream: false,
      stream: 'GPS5',
      timeOut: null,
      geoidHeight: true
    },
    preferred: { ellipsoid: true }
  },
  virb: {
    mandatory: {
      dateStream: false,
      timeOut: null,
      geoidHeight: true
    },
    preferred: { ellipsoid: true, timeIn: 'MP4', stream: 'GPS5' }
  },
  kml: {
    mandatory: { dateStream: false, stream: 'GPS5', timeOut: null },
    preferred: {}
  },
  geojson: {
    mandatory: {
      dateStream: false,
      stream: 'GPS5',
      timeOut: null,
      geoidHeight: true
    },
    preferred: { ellipsoid: true }
  },
  csv: { mandatory: { dateStream: false }, preferred: {} },
  mgjson: {
    mandatory: { dateStream: true, timeOut: null },
    preferred: {
      groupTimes: 'frames',
      disableInterpolation: true,
      disableMerging: false
    }
  }
};

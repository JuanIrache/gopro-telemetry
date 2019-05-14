# GoPro Telemetry

Reads telemetry from the GPMF track in GoPro cameras (Hero5 and later).

Accepts binary data and returns a JavaScript object. See samples/example.js for a basic implementation.

Extracting the raw data from the video file is not covered yet.

```shell
$ npm i gopro-telemetry
```

```js
const goproTelemetry = require('gopro-telemetry');
const telemetry = goproTelemetry(rawData);
```

Made possible thanks to https://github.com/gopro/gpmf-parser

## To-Do

- Face in hero7 broken
- Some fourCCs should always be arrays (devc,strm)
- Take potential nested arrays into account f[8]
- Add filtering options (GPS, Accel, Gyro...)
- Automated testing
- Interpret data
- Create additional package for extracting the binary data form mp4/mov files
- Create additional package for converting the data to other formats
- Refactoring for performance?

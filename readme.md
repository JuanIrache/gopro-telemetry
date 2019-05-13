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

- Automated testing
- Interpret data
- Add filtering options (GPS, Accel, Gyro...)
- Add information on known types
- Comments
- Take potential nested arrays into account f[8]
- Read 64 bit data
- Is length needed for other than string?
- Create additional package for extracting the binary data form mp4/mov files
- Create additional package for converting the data to other formats

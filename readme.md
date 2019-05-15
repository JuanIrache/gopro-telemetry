# GoPro Telemetry

Work in progress. Don't rely on it for important stuff yet.

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
- refactor index a bit and move to ParseRaw or similar
- specify as much as possible which keys should array and/or which don't. Or maybe keep the last item of each nest arrayed and flatten the rest
- Scale data even in raw? (i think so, leave matrix for other stages? not sure)
- Enable raw option
- Add filtering options (GPS, Accel, Gyro...)
- Interpret data
  - Calculate time (take reference from mp4 file?)
  - What to do with EMPT, TSMP?
- Create additional package for extracting the binary data form mp4/mov files
- Create additional package for converting the data to other formats
- Refactoring for performance?

## Maybe To-Do

- Take potential nested arrays into account f[8]? Never found one to test
- Pending types:
  - d | 64-bit double precision (IEEE 754) | double
  - G | 128-bit ID (like UUID) | uint8_t guid[16]
  - q | 32-bit Q Number Q15.16 | uint32_t | 16-bit integer (A) with 16-bit fixed point (B) for A.B value (range -32768.0 to 32767.99998)
  - Q | 64-bit Q Number Q31.32 | uint64_t | 32-bit integer (A) with 32-bit fixed point (B) for A.B value.

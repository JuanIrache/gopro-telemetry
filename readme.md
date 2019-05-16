# GoPro Telemetry

**Work in progress. Don't rely on it for important stuff yet.**

Reads telemetry from the GPMF track in GoPro cameras (Hero5 and later).

Created for the [GoPro Telemetry Extractor](https://tailorandwayne.com/gopro-telemetry-extractor/).

Here's a [playlist with cool uses of the GoPro metadata ](https://www.youtube.com/watch?v=V4eJDQik-so&list=PLgoeWSWqXedK_TbrZXg7L926Kzb-g_CXz).

Accepts binary data and returns a JavaScript object. See **samples/example.js** for a basic implementation.

Extracting the raw data track from the video file is not covered yet.

Install:

```shell
$ npm i gopro-telemetry
```

Use:

```js
const goproTelemetry = require('gopro-telemetry');
const telemetry = goproTelemetry(rawData, options);
```

## Options (optional)

Some options may be incompatible with others.

- **debug** (boolean) Outputs some feedback. Default: _false_
- **tolerant** (boolean) Returns data even if format does not match expectations. Default: _false_
- **raw** (boolean) Returns the data as close to raw as possible. No matrix transformations, no scaling. Disables the following options. Default: _false_
- **style** (string) Formats the output following some standard. For example, _geoJSON_. Implementation pending. Default: _null_
- **filter** (array of string) Returns only the selected information (GPS, gyroscope...). Implementation pending. Default: _null_
- **time** (string) Groups samples in time units. Ideally will accept things like _frames_, _milliseconds_, _seconds_, _timecode_. Implementation pending. Default: _null_

Example:

```js
const telemetry = goproTelemetry(rawData, { debug: true, tolerant: true, interpret: false, filter: ['GPS'] });
```

## Available data

Depending on the camera, model, settings and accessories, these are some of the available data:

- GPS location
- GPS speed
- Accelerometer (m/s²)
- Gyroscope (rad/s)
- ISO
- Shutter Speed (s)
- Timestamps (µs)
- Magnetometer (µT)
- Face detection
- Highlights (manual and computed)
- White balance
- Luma
- Hue
- Image uniformity
- Scene classifier

This project is possible thanks to the [gpmf-parser documentation](https://github.com/gopro/gpmf-parser), open sourced by GoPro.

## More creative coding

If you liked this you might like other [creative coding projects](https://tailorandwayne.com/coding-projects/).

## To-Do

- Interpret data
  - Add filtering options (GPS, Accel, Gyro...)
  - Calculate time (take reference from mp4 file?)
  - What to do with EMPT, TSMP?
  - Enable grouping packets per time unit / frame
- Review consol.log/error usage
- Create additional package for extracting the binary data form mp4/mov files
- Create additional package for converting the data to other formats
- Refactoring for performance?

## Maybe To-Do

- Automatically detect which keys should be arrays of samples?
- Take potential nested arrays into account f[8]? Never found one to test
- Pending types:
  - d | 64-bit double precision (IEEE 754) | double
  - G | 128-bit ID (like UUID) | uint8_t guid[16]
  - q | 32-bit Q Number Q15.16 | uint32_t | 16-bit integer (A) with 16-bit fixed point (B) for A.B value (range -32768.0 to 32767.99998)
  - Q | 64-bit Q Number Q31.32 | uint64_t | 32-bit integer (A) with 32-bit fixed point (B) for A.B value.

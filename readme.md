# GoPro Telemetry

**Work in progress. Don't rely on it for important stuff yet.**

Reads telemetry from the GPMF track in GoPro cameras (Hero5 and later).

Created for the [GoPro Telemetry Extractor](https://tailorandwayne.com/gopro-telemetry-extractor/).

Here's a [playlist with cool uses of the GoPro metadata ](https://www.youtube.com/watch?v=V4eJDQik-so&list=PLgoeWSWqXedK_TbrZXg7L926Kzb-g_CXz).

Accepts an object with binary data and timing data. Returns a JavaScript object with a key for each device that was found. See **samples/example.js** for a basic implementation.

You must extract the raw GMPF data from the video file first. You can do so with [gpmf-extract](https://github.com/JuanIrache/gpmf-extract).

**gpmf-extract** will provide you with an object ready to import. It contains:

- **rawData** (buffer) The GPMF track of the video file.
- **timing** (object) Provides timing information such as starting time, framerate, payload duration... as extracted from [gpmf-extract](https://github.com/JuanIrache/gpmf-extract).

Install:

```shell
$ npm i gopro-telemetry
```

Use:

```js
const goproTelemetry = require('gopro-telemetry');
const telemetry = goproTelemetry(input, options); //Get your input with gpmf-extract
```

## Options (optional)

Some options may be incompatible with others.

- **debug** (boolean) Outputs some feedback. Default: _false_
- **tolerant** (boolean) Returns data even if format does not match expectations. Default: _false_
- **deviceList** (boolean) Returns an object with only the ids and names of found devices. **Disables the following options**. Default: _false_
- **device** (number) Filters the results by device id. Default: _null_
- **raw** (boolean) Returns the data as close to raw as possible. No matrix transformations, no scaling. **Disables the following options**. Default: _false_

Not yet implemented:

- **style** (string) Formats the output following some standard. For example, _geoJSON_. Default: _null_
- **filter** (array of string) Returns only the selected information (GPS, gyroscope...). Default: _null_
- **time** (string) Groups samples in time units. Ideally will accept things like _frames_, _milliseconds_, _seconds_, _timecode_. Default: _null_

Example:

```js
const telemetry = goproTelemetry(rawData, { raw: true, tolerant: true, filter: ['GPS'] });
```

This slightly more comprehensive example includes the data extraction step with [gpmf-extract](https://github.com/JuanIrache/gpmf-extract).

```js
const gpmfExtract = require('gpmf-extract');
const goproTelemetry = require(`gopro-telemetry`);
const fs = require('fs');

const file = fs.readFileSync('path_to_your_file.mp4');

gpmfExtract(file)
  .then(extracted => {
    let telemetry = goproTelemetry(extracted);
    fs.writeFileSync('output_path.json', JSON.stringify(telemetry));
    console.log('Telemetry saved as JSON');
  })
  .catch(error => console.log(error));
```

**timing** object structure:

```
{ frameDuration: 0.03336666666666667,
  start: 2017-04-17T19:27:57.000Z,//Date object
  samples:
   [ { cts: 0, duration: 1001 },//Starting point and duration in milliseconds
     { cts: 1001, duration: 1001 },
     { cts: 2002, duration: 1001 },
     { cts: 3003, duration: 1001 },
     { cts: 4004, duration: 1001 } ] }
```

## Available data

Depending on the camera, model, settings and accessories, these are some of the available data:

- GPS location (deg, m)
- GPS speed (m/s)
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
  - Handle files with multiple devices BEFORE times
  - Calculate time (take reference from mp4 file if gps missing)
    - Merge timed DEVC by fourCC
    - Document time inputs and outputs (gps time is utc, mp4 time is local) (explain sticky values)
    - Check time in second device (karma)
  - Add filtering options (GPS, Accel, Gyro...)
  - What to do with EMPT, TSMP?
  - Enable grouping packets per time unit / frame
  - Remove used values
  - Delete interpretsamples
- Test interpretation
- Comment index
- Document output
- Review console.log/error usage
- Create additional package for converting the data to other formats
- Remove Work-in-progress warning
- Refactoring for performance?

## Maybe To-Do

- Take potential nested arrays into account f[8]? Never found one to test
- Pending types:
  - d | 64-bit double precision (IEEE 754) | double
  - G | 128-bit ID (like UUID) | uint8_t guid[16]
  - q | 32-bit Q Number Q15.16 | uint32_t | 16-bit integer (A) with 16-bit fixed point (B) for A.B value (range -32768.0 to 32767.99998)
  - Q | 64-bit Q Number Q31.32 | uint64_t | 32-bit integer (A) with 32-bit fixed point (B) for A.B value.

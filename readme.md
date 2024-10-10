# GoPro Telemetry

Parses telemetry from the GPMF track in GoPro cameras (Hero5 and later).

Created for [Telemetry Overlay](https://goprotelemetryextractor.com/telemetry-overlay-gps-video-sensors) and the [Telemetry Extractor for GoPro](https://goprotelemetryextractor.com/free).

Here's a [gallery with cool uses of the GoPro telemetry](https://goprotelemetryextractor.com/gallery).

Accepts an object with binary data and timing data. Returns a promise that resolves to a JavaScript object (or optionally to other file formats) with a key for each device that was found. See **samples/example.js** for a basic implementation.

You must extract the raw GMPF data from the video file first. You can do so with [gpmf-extract](https://github.com/JuanIrache/gpmf-extract).

**gopro-telemetry** expects, as the mandatory first parameter, an object with the following properties:

- **rawData** (buffer) The GPMF track of the video file.
- **timing** (object) Provides timing information such as starting time, framerate, payload duration... as extracted from [gpmf-extract](https://github.com/JuanIrache/gpmf-extract).

An **options** object and a **callback** function are additional optional parameters. If a callback is provided, it will receive the extracted data, and the promise will not resolve the result.

Install:

```shell
$ npm i gopro-telemetry
```

Use as promise:

```js
const goproTelemetry = require('gopro-telemetry');
const telemetry = await goproTelemetry(input, options); //Get your input with gpmf-extract
```

Use with callback:

```js
const goproTelemetry = require('gopro-telemetry');
function callback(data) {
  // Do something with the data
}
const telemetry = await goproTelemetry(input, options, callback);
```

## Options

The options must be an object. The following keys are supported.

- **debug** (boolean) Outputs some feedback.
- **tolerant** (boolean) Returns data even if format does not match expectations.
- **deviceList** (boolean) Returns an object with only the ids and names of found devices. **Disables the following options**.
- **streamList** (boolean) Returns an object with only the keys and names of found streams by device. **Disables the following options**.
- **device** (array of numbers) Filters the results by device id.
- **stream** (array of strings) Filters the results by device stream (often a sensor) name. You can find information on what many sensors are called [here](https://github.com/gopro/gpmf-parser#where-to-find-gpmf-data). By passing _GPS_, the code will attempt to select the best stream available for GPS data (_GPS5_ in old cameras, _GPS9_ in new ones)
- **raw** (boolean) Returns the data as close to raw as possible. No matrix transformations, no scaling, no filtering. It does add some custom keys (like **interpretSamples**) that will help with successive interpretation passes of the data. **Disables the following options**.
- **repeatSticky** (boolean) Puts the sticky values in every sample and deletes the 'sticky' object. This will increase the output size.
- **repeatHeaders** (boolean) Instead of a 'values' array, the samples will be returned under their keys, based on the available name and units. This might increase the output size.
- **timeOut** (string) By default the code exports both _cts_ (milliseconds since first frame) and _date_ (full date and time). Specify one (**cts** or **date**) in order to ignore the other.
- **timeIn** (string) By default the code uses MP4 time (local, based on device) for _cts_ and GPS time (UTC) for _date_. Specify one (**MP4** or **GPS**) in order to ignore the other.
- **mp4header** (boolean) The GPMF atom from the header of the mp4 contains data (highlights, video settings) in a slightly different format. This flag will avoid making some of the assumptions we make for the rest of the data, like timing strategies.
- **groupTimes** (number/string) Group samples by units of time (milliseconds). For example, if you want one sample per second, pass it 1000. It also accepts the string **frames** to match the output to the video frame rate. This can drastically reduce the output size. By default, it will interpolate new samples if a time slot is empty.
- **removeGaps** (boolean) Will attempt to leave no empty spaces, in terms of _cts_ times, between non-consecutive data sources. Disabled when using _GPS_ time exclusively.
- **disableInterpolation** (boolean) Will allow _groupTimes_ to work slightly faster by skipping time slots where there are no samples.
- **disableMerging** (boolean) Will allow _groupTimes_ to work slightly faster by selecting one sample per time slot instead of merging them all.
- **smooth** (number) Uses the adjacent samples os a sample to smoothen it. For example, a value of 3 would average 3 samples before and 3 samples after each one. This can be a slow process.
- **dateStream** (boolean) Creates an additional stream with only date information, no values, to make sure we have timing information of the whole track, even if the selected streams have empty sections.
- **ellipsoid** (boolean) On old cameras (pre Hero8) the GPS altitude will be converted by default from WGS84 (World Geodetic System) ellipsoid to sea level with EGM96 (Earth Gravitational Model 1996). Use this option if you prefer the raw ellipsoid values. The newer cameras (Hero 8, Max...) provide the data directly as mean sea level, so this setting does not apply. Altitude corrections require the optional peer dependency [egm96-universal](https://www.npmjs.com/package/egm96-universal). If not present, the result will be as if this option was true.
- **geoidHeight** (boolean) Saves altitude corrections between ellipsoid and sea level without applying them, for third party processing. Only relevant when _ellipsoid_ is enabled. Requires the optional peer dependency [egm96-universal](https://www.npmjs.com/package/egm96-universal).
- **GPSPrecision** (number) Will filter out GPS samples where the Dilution of Precision (multiplied by 100) is higher than specified (under 500 should be good).
- **GPSFix** (number) Will filter out GPS samples where the type of GPS lock is lower than specified (0: no lock, 2: 2D lock, 3: 3D Lock).
- **WrongSpeed** (number) Will filter out GPS positions that generate higher speeds than indicated in meters per second. This acts on a sample to sample basis, so in order to avoid ignoring generally good samples that produce high speeds due to noise, it is important to set a generous (high) value.
- **preset** (string) Will convert the final output to the specified format. Some formats will force certain options. See details below.
- **name** (string) Some preset formats (gpx) accept a name value that will be included in the file.
- **decimalPlaces** (number) Sets Decimal Places on Number Values. For GPS coordinates, 6 decimal places is roughly 10cm of precision, 9 would be sufficient for professional survey-grade GPS coordinates.
- **progress** (function) Function to execute when progress (between 0 and 1) is made in the extraction process. Not proportional.
- **comment** (boolean) Add comments to formats like GPX or KML with fields they do not strictly support, like recorded speed.

All options default to _null/false_. Using filters to retrieve the desired results reduces the processing time.

Example:

```js
const telemetry = await goproTelemetry(
  { rawData, timing },
  { stream: ['ACCL'], repeatSticky: true }
);
```

This slightly more comprehensive example includes the data extraction step with [gpmf-extract](https://github.com/JuanIrache/gpmf-extract).

```js
const gpmfExtract = require('gpmf-extract');
const goproTelemetry = require(`gopro-telemetry`);
const fs = require('fs');

const file = fs.readFileSync('path_to_your_file.mp4');

gpmfExtract(file)
  .then(extracted => {
    goproTelemetry(extracted, {}, telemetry => {
      fs.writeFileSync('output_path.json', JSON.stringify(telemetry));
      console.log('Telemetry saved as JSON');
    });
  })
  .catch(error => console.error(error));
```

**timing** object structure:

```
{ frameDuration: 0.03336666666666667,
  videoDuration: 480,
  start: 2017-04-17T19:27:57.000Z,//Date object
  samples:
   [ { cts: 0, duration: 1001 },//Starting point and duration in milliseconds
     { cts: 1001, duration: 1001 },
     { cts: 2002, duration: 1001 },
     { cts: 3003, duration: 1001 },
     { cts: 4004, duration: 1001 } ] }
```

## Output

The output with the default options looks like this:

```
{ deviceId : {
    data about the device : values,
    streams : {
      stream_key : {
        data about the samples : values,
        samples : [
          {
            cts : time from start,
            date : time and date,
            value : sample
            sticky : {
              name : value
            }
          },
          {
            cts : time from start,
            date : time and date,
            value : sample
          }
        ]
      }
    }
  }
}
```

Sticky values apply to all successive samples. You can export them to the outer object of all samples with the **repeatSticky** option.

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
- White balance (ºK or RGB)
- Luma
- Hue
- Image uniformity
- Scene classifier
- Camera Orientation
- Image Orientation
- Gravity Vector (useful for Pitch, Roll and Yaw)
- Audio levels
- Wind detection
- Mic wet detection
- And more

This project is possible thanks to the [gpmf-parser documentation](https://github.com/gopro/gpmf-parser), open sourced by GoPro.

## Presets

These are the available preset formats:

- **gpx** (.gpx) GPS Exchange format (returns as _string_). Compatible with many maps systems. For a quick visualization you can use the [DJI SRT Viewer](https://djitelemetryoverlay.com/srt-viewer/). Will force the _stream_ filter to be _GPS_ and will use _ellipsoid_ altitude if not specified.
- **kml** (.kml) Keyhole Markup Language (returns as _string_). Compatible with Google Earth. Will force the _stream_ filter to be _GPS_.
- **geojson** (.json / .geojson) Open standard format designed for representing simple geographical features. Will force the _stream_ filter to be _GPS_, the _timeOut_ to be _null_ (output both _cts_ and _date_) and will use _ellipsoid_ altitude if not specified.
- **csv** (.csv) Comma separated values, readable by Excel and other spreadsheet software. Will return an object with a CSV formatted string for every _stream_ in every _device_ (except when filters are present).
- **mgjson** (.mgjson) Format for Adobe After Effects. The file can be imported as standard footage and will generate data streams to link properties/effects to. See how to use data in After Effects [here](https://helpx.adobe.com/after-effects/using/data-driven-animations.html).
- **virb** (.gpx) Just like GPX but with small changes for compatibility with Garmin's Virb Edit video editing software. Based on [Garmin's Trackpoint Extension](https://www8.garmin.com/xmlschemas/TrackPointExtensionv2.xsd). Also supports the the _stream_ filter to be _ACCL_, which will create a GPX file with empty location data but valid acceleration data, based on [Garmin's Acceleration Extension](https://www8.garmin.com/xmlschemas/AccelerationExtensionv1.xsd). Both GPS and accelerometer are not allowed at the same time, for now. Will use MP4 time if **timeIn** is not specified.

## Merging consecutive files

GoPros split very long videos in multiple files. In order to generate a single metadata output you can provide the data as an array of objects with data and timing information. Note that usually the last 1-2 seconds of a video file do not include metadata. In some cases this might create a noticeable gap.

```js
const telemetry = await goproTelemetry([
  { rawData: file1Data, timing: file1Timing },
  { rawData: file2Data, timing: file2Timing }
]);
```

## Reusing parsed data

The first step in the parsing process is usually the most resource-intensive. To avoid repeating it if you want to apply different options to the same input, you can retrieve the parsed data by using the **raw** option and pass it to in the successive calls as **parsedData** instead of **rawData**.

```js
const parsedData = await goproTelemetry({ rawData, timing }, { raw: true });
const telemetry = await goproTelemetry({ parsedData, timing });
```

The 'raw' data option is sensitive to the options: **device**, **stream**, **deviceList**, **streamList**, **tolerant**, **debug** and indirectly to some **presets**. Meaning this approach should not be used if any of these options is going to change between calls.

## Altitude correction

Altitude data in old cameras was not recorded as mean-sea-level. The library tries to correct for this automatically, or if requested through the options. For altitude correction to work the optional peer dependency [egm96-universal](https://www.npmjs.com/package/egm96-universal) must be installed.

## MP4 header data

Additionally to the GPMF track, the mp4 header contains a GPMF atom embedded within the 'udta' atom. It contains, for example, manual and atomated **highlight** tags and **video settings**. Its structure is slightly different to the common GPMF track, so some different (and opinionated) interpretation is applied when the **mp4header** option is used.

## More creative coding

If you liked this you might like some of my [app prototyping](https://prototyping.barcelona).

## Contribution

Please make your changes to the **dev** branch, so that automated tests can be run before merging to **master**. Also, if possible, provide tests for new functionality.

## To-Do

- merging streams with 'multiple' values (nested arrays) does always go right, like HERO13 LOGS
- removeGaps breaks joining streams in some conditions (GRAV to CSV)
- removeGaps also removes small initial gap of first file
- Don't group times to frame rate if known rate of stream is already frame rate (GRAV, CORI...)
- Review CSV conversion (when only 1 sticky value, it does not print)
- Adjust grouping times better to frame cts (fixing_grouptimes branch)
- Streams look out of sync some times, improve timing accuracy?
- GroupTimes higher than 1000 and disableMerging seem not to work (produces large files)
- Test rmrkToNameUnits
- Test different approaches to consecutive file timing, including removeGaps
- Test for WrongSpeed filter

## Maybe To-Do

- Hardcode (r,g,b) in rgb gains output?
- Modify binary data: https://www.npmjs.com/package/binary-parser-encoder
- Keep klv types and scaling to identify what are integers and what are floats and avoid smoothing/interpolation when int?
- Compute properties? Distance, turns, vibration, statistics...?
- Improve accuracy like GetGPMFSampleRate in https://github.com/gopro/gpmf-parser/blob/master/demo/GPMF_mp4reader.c
- grouptimes and smooth can produce bad results when interpolating/smoothing integers (like it happened before with face ids)
- Optimise parseKLV performance even more
- Implement highlight tags? https://github.com/gopro/gpmf-parser/issues/21

## Acknowledgements/credits

- [Juan Irache](https://github.com/JuanIrache) - Main developer
- [Thomas Sarlandie](https://github.com/sarfata) - Contributor
- [Adam Eisenreich](https://github.com/Akxe) - Contributor
- [Alex](https://github.com/rtf6x) - Contributor
- [James Alexandre](https://github.com/itsonlyjames) - Contributor
- [Claudio Genovese](https://github.com/cgen0) - Contributor

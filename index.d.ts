interface GoProTelemetryAllOptions {
  debug?: boolean;
  /** Returns data even if format does not match expectations. */
  tolerant?: boolean;
  /** Returns an object with only the ids and names of found devices. Disables the following options. */
  deviceList?: boolean;
  /** Returns an object with only the keys and names of found streams by device. Disables the following options. */
  streamList?: boolean;
  /** Filters the results by device id. */
  device?: number[];
  /** Filters the results by device stream (often a sensor) name.*/
  stream?: (keyof SampleOutputFromType) | (keyof SampleOutputFromType)[];
  /** Returns the data as close to raw as possible. No matrix transformations, no scaling, no filtering. It does add some custom keys (like interpretSamples) that will help with successive interpretation passes of the data. Disables the following options. */
  raw?: boolean;
  /** Puts the sticky values in every sample and deletes the 'sticky' object. This will increase the output size. */
  repeatSticky?: boolean;
  /** Instead of a 'values' array, the samples will be returned under their keys, based on the available name and units. This might increase the output size. */
  repeatHeaders?: boolean;
  /** By default the code exports both cts (milliseconds since first frame) and date (full date and time). Specify one (cts or date) in order to ignore the other. */
  timeOut?: 'cts' | 'date';
  /** By default the code uses MP4 time (local, based on device) for cts and GPS time (UTC) for date. Specify one (MP4 or GPS) in order to ignore the other. */
  timeIn?: 'MP4' | 'GPS';
  /** The GPMF atom from the header of the mp4 contains data (highlights, video settings) in a slightly different format. This flag will avoid making some of the assumptions we make for the rest of the data, like timing strategies. */
  mp4header?: boolean;
  /** Group samples by units of time (milliseconds). For example, if you want one sample per second, pass it 1000. It also accepts the string frames to match the output to the video frame rate. This can drastically reduce the output size. By default, it will interpolate new samples if a time slot is empty. */
  groupTimes?: number | 'frames';
  /** Will attempt to leave no empty spaces, in terms of cts times, between non-consecutive data sources. Disabled when using GPS time exclusively. */
  removeGaps?: boolean;
  /** Will allow groupTimes to work slightly faster by skipping time slots where there are no samples. */
  disableInterpolation?: boolean;
  /** Will allow groupTimes to work slightly faster by selecting one sample per time slot instead of merging them all. */
  disableMerging?: boolean;
  /** Uses the adjacent samples os a sample to smoothen it. For example, a value of 3 would average 3 samples before and 3 samples after each one. This can be a slow process. */
  smooth?: number;
  /** Creates an additional stream with only date information, no values, to make sure we have timing information of the whole track, even if the selected streams have empty sections. */
  dateStream?: boolean;
  /** On old cameras (pre Hero8) the GPS5 altitude will be converted by default from WGS84 (World Geodetic System) ellipsoid to sea level with EGM96 (Earth Gravitational Model 1996). Use this option if you prefer the raw ellipsoid values. The newer cameras (Hero 8, Max...) provide the data directly as mean sea level, so this setting does not apply. */
  ellipsoid?: boolean;
  /** Saves the altitude offset without applying it, for third party processing. Only relevant when ellipsoid is enabled. */
  geoidHeight?: boolean;
  /** Will filter out GPS5 samples where the Dilution of Precision (x100) is higher than specified (under 500 should be good). */
  GPS5Precision?: number;
  /** Will filter out GPS5 samples where the type of GPS lock is lower than specified (0: no lock, 2: 2D lock, 3: 3D Lock). */
  GPS5Fix?: 0 | 2 | 3;
  /** Will filter out GPS positions that generate higher speeds than indicated in meters per second. This acts on a sample to sample basis, so in order to avoid ignoring generally good samples that produce high speeds due to noise, it is important to set a generous (high) value. */
  WrongSpeed?: number;
  /** Will convert the final output to the specified format. */
  preset?: 'gpx' | 'virb' | 'kml' | 'geojson' | 'csv' | 'mgjson';
  /** Sets Precision on Coordinates for some presets (GPX, geoJSON, KML, Virb). 6 decimal places is roughly 10cm of precision, 9 would be sufficient for professional survey-grade GPS coordinates.  */
  CoordinatesPrecision?: number;
  /** Some preset formats (gpx) accept a name value that will be included in the file. */
  name?: string;
  /** Function to execute when progress (between 0 and 1) is made in the extraction process. Not proportional. */
  progress?: (progress: number) => void;
}

type GoProTelemetryOptionsWithPreset = Omit<GoProTelemetryAllOptions, 'deviceList' | 'streamList' | 'raw' | 'repeatSticky' | 'repeatHeaders'>;

interface GoProTelemetryGPXOptions extends Omit<GoProTelemetryOptionsWithPreset, 'dateStream' | 'stream' | 'raw' | 'timeOut' | 'geoidHeight'> {
  /** GPS Exchange format (returns as string). Compatible with many maps systems. For a quick visualization you can use the DJI SRT Viewer. Will force the stream filter to be GPS5 and will use ellipsoid altitude if not specified. */
  preset: 'gpx';
}

interface GoProTelemetryVIRBOptions extends Omit<GoProTelemetryOptionsWithPreset, 'dateStream' | 'stream' | 'timeOut' | 'geoidHeight'> {
  /** Just like GPX but with small changes for compatibility with Garmin's Virb Edit video editing software. Based on Garmin's Trackpoint Extension. Also supports the the stream filter to be ACCL, which will create a GPX file with empty location data but valid acceleration data, based on Garmin's Acceleration Extension. Bot GPS and accelerometer are not allowed at the same time, for now. Will use MP4 time if timeIn is not specified. */
  preset: 'virb';
}

interface GoProTelemetryKMLOptions extends Omit<GoProTelemetryOptionsWithPreset, 'dateStream' | 'timeOut' | 'geoidHeight'> {
  /** Keyhole Markup Language (returns as string). Compatible with Google Earth. Will force the stream filter to be GPS5. */
  preset: 'kml';
}

interface GoProTelemetryGeoJSONOptions extends Omit<GoProTelemetryOptionsWithPreset, 'dateStream' | 'stream' | 'timeOut'> {
  /** Open standard format designed for representing simple geographical features. Will force the stream filter to be GPS5, the timeOut to be null (output both cts and date) and will use ellipsoid altitude if not specified. */
  preset: 'geojson';
}

interface GoProTelemetryCSVOptions extends Omit<GoProTelemetryOptionsWithPreset, 'dateStream' | 'stream' | 'timeOut' | 'geoidHeight'> {
  /**  Comma separated values, readable by Excel and other spreadsheet software. Will return an object with a CSV formatted string for every stream in every device (except when filters are present). */
  preset: 'csv';
}

interface GoProTelemetryMGJSONOptions extends Omit<GoProTelemetryOptionsWithPreset, 'dateStream' | 'timeOut'> {
  /** Format for Adobe After Effects. The file can be imported as standard footage and will generate data streams to link properties/effects to. See how to use data in After Effects here. */
  preset: 'mgjson';
}

interface GoProTelemetryPresetLessOptions extends GoProTelemetryAllOptions {
  preset?: undefined;
}

type GoProTelemetryOptions =
  | GoProTelemetryPresetLessOptions
  | GoProTelemetryGPXOptions
  | GoProTelemetryVIRBOptions
  | GoProTelemetryKMLOptions
  | GoProTelemetryGeoJSONOptions
  | GoProTelemetryCSVOptions
  | GoProTelemetryMGJSONOptions;

interface GoProTelemetryTiming {
  /** Duration of video in seconds */
  readonly videoDuration: number;
  /** Duration of frame in mili-seconds */
  readonly frameDuration: number;
  /** Date when the video capture started */
  readonly start: Date;
  readonly samples: {
    /** Offset */
    readonly cts: number;
    readonly duration: number;
  }[];
}

interface GoProTelemetryUnprocessedInput {
  readonly rawData: Buffer | Uint8Array;
  readonly timing?: GoProTelemetryTiming;
}

interface GoProTelemetryProcessedInput {
  readonly parsedData: GoProTelemetryDefaultResult<any>;
  readonly timing: GoProTelemetryTiming;
}

type GoProTelemetryInput = GoProTelemetryUnprocessedInput | Required<GoProTelemetryUnprocessedInput>[] | GoProTelemetryProcessedInput | Required<GoProTelemetryProcessedInput>[];

type Position = [number, number, number?];
interface GeoJSON {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: Position[];
  };
  properties: {
    name?: string,
    device?: string;
    geoidHeight: number;
    AbsoluteUtcMicroSec: number[];
    RelativeMicroSec: number[];
  };
}

interface MGJson {
  version: 'MGJSON2.0.0';
  creator: 'https://github.com/JuanIrache/gopro-telemetry';
  dynamicSamplesPresentB: boolean;
  dynamicDataInfo: {
    useTimecodeB: boolean;
    utcInfo: {
      precisionLength: number;
      isGMT: boolean;
    };
  };
  dataOutline: {
    objectType: string;
    displayName: string;
    dataType: {
      type: string;
      paddedStringProperties: {
        maxLen: number;
        maxDigitsInStrLength: number;
        eventMarkerB: boolean;
      };
    };
    matchName: string;
    value: string;
  }[];
  //And paste the converted data
  dataDynamicSamples: {
    sampleSetID: string;
    samples: GoProTelemetryProcessedInput['timing']['samples'][];
  }[];
}

type ExtractStreamType<O extends GoProTelemetryPresetLessOptions> =
  O['stream'] extends string
    ? O['stream']
    : O['stream'] extends any[]
    ? O['stream'][number]
    : keyof SampleOutputByType;


interface GoProTelemetryStreamResult<O extends GoProTelemetryPresetLessOptions> {
  'device name': string;
  streams: {
    [K in (SampleOutputFromType[ExtractStreamType<O> & (keyof SampleOutputFromType)] & (keyof SampleOutputByType))]?: SampleOutputByType[K];
  };
}

interface GoProTelemetryDefaultResult<O extends GoProTelemetryPresetLessOptions> {
  [key: number]: GoProTelemetryStreamResult<O>;
  1: GoProTelemetryStreamResult<O>;
}

type CommonSampleOutput<
  N extends string,
  U extends string | string[] | void,
  V extends any,
  S extends Record<any, any> | never = never,
  E extends Record<any, any> | never = never
> = {
  name: N;
  units: U
  samples: ({
    cts: number;
    date: Date;
    value: V;
    sticky?: S;
  })[];
};

// TODO: This list is not complete, please help by completing it
interface SampleOutputByType {
  AALP: CommonSampleOutput<
    'AGC audio level[rms_level ,peak_level]',
    'dBFS',
    number
  >;
  ACCL: CommonSampleOutput<
    'Accelerometer' | 'Accelerometer (z,x,y)' | 'Accelerometer (up/down, right/left, forward/back)',
    'm/s²',
    [number, number, number],
    { 'temperature [°C]': number }
  >;
  ATTD: CommonSampleOutput<
    'Attitude',
    ['s', 'rad', 'rad', 'rad', 'rad/s', 'rad/s', 'rad/s', ''],
    [number, number, number, number, number, number, number, number]
  >;
  ATTR: CommonSampleOutput<
    'Attitude Target',
    ['s', 'rad', 'rad', 'rad', ''],
    [number | bigint, number, number, number, number]
  >;
  BPOS: CommonSampleOutput<
    'Controller',
    ['deg', 'deg', 'm', 'deg', 'deg', 'm', 'm', 'm'],
    [number, number, number, number, number, number, number, number]
  >;
  CSEN: CommonSampleOutput<
    'Coyote Sense',
    ['s', 'rad/s', 'rad/s', 'rad/s', 'g', 'g', 'g', '', '', '', ''],
    [number, number, number, number, number, number, number, number, number, number, number]
  >;
  CYTS: CommonSampleOutput<
    'Coyote Status',
    ['s', '', '', '', '', 'rad', 'rad', 'rad', '', ''],
    [number, number, number, number, number, number, number, number, number, number]
  >;
  CORI: CommonSampleOutput<
    'CameraOrientation',
    never,
    [number, number, number, number]
  >;
  ESCS: CommonSampleOutput<
    'ESC Status',
    ['s', 'rpm', 'rpm', 'rpm', 'rpm', 'rpm', 'rpm', 'rpm', 'rpm', 'degC', 'degC', 'degC', 'degC', 'V', 'V', 'V', 'V', 'A', 'A', 'A', 'A', '', '', '', '', '', '', '', '', ''],
    number[]
  >;
  FACE: CommonSampleOutput<
    'Face Coordinates and details (x,y,w,h,unknown,smile)',
    never,
    [number, number, number, number, number, number],
    never,
    { subStreamName: `ID:${number}` }
  >;
  FACE1: SampleOutputByType['FACE'];
  FACE2: SampleOutputByType['FACE'];
  FACE3: SampleOutputByType['FACE'];
  FACE4: SampleOutputByType['FACE'];
  FACE5: SampleOutputByType['FACE'];
  FACE6: SampleOutputByType['FACE'];
  FACE7: SampleOutputByType['FACE'];
  FACE8: SampleOutputByType['FACE'];
  FACE9: SampleOutputByType['FACE'];
  FWVS: CommonSampleOutput<
    'FWVS',
    never,
    string
  >;
  GPS5: CommonSampleOutput<
    'GPS (Lat., Long., Alt., 2D speed, 3D speed)',
    ['deg', 'deg', 'm', 'm/s', 'm/s'],
    [number, number, number, number, number],
    {
      fix: number;
      precision: number;
      'altitude system'?: 'MSLV';
    }
  >;
  GPS9: CommonSampleOutput<
    'GPS (Lat., Long., Alt., 2D, 3D, days, secs, DOP, fix)',
    ['deg', 'deg', 'm', 'm/s', 'm/s', '', 'secs', '', ''],
    [number, number, number, number, number, number, number, number, number],
    {
      'altitude system': 'MSLV';
    }
  >;
  GLPI: CommonSampleOutput<
    'Position',
    ['s', 'deg', 'deg', 'm', 'm', 'm/s', 'm/s', 'm/s', 'deg'],
    [number, number, number, number, number, number, number, number, number]
  >;
  GLPR: CommonSampleOutput<
    'GPS RAW',
    ['s', 'deg', 'deg', 'm', 'm', 'm', 'm/s', 'deg', '', ''],
    [number, number, number, number, number, number, number, number, number, number]
  >;
  GRAV: CommonSampleOutput<
    'Gravity Vector',
    never,
    [number, number, number]
  >;
  GYRO: CommonSampleOutput<
    'Gyroscope' | 'Gyroscope (z,x,y)',
    'rad/s',
    [number, number, number],
    { 'temperature [°C]': number }
  >;
  HLMT: CommonSampleOutput<
    'Highlights',
    ['ms', 'ms', 'ms', 'deg', 'deg', 'm', '_', '%', '_'],
    [number, number, number, number, number, number, string, number, number]
  >;
  HUES: CommonSampleOutput<
    'Predominant hue  | hue (253,49,172)',
    ['weight'],
    [number, number, number]
  >;
  IORI: CommonSampleOutput<
    'ImageOrientation',
    never,
    [number, number, number, number]
  >;
  ISOE: CommonSampleOutput<
    'Sensor ISO',
    never,
    number
  >;
  ISOG: CommonSampleOutput<
    'Sensor gain (ISO x100)',
    never,
    number
  >;
  KBAT: CommonSampleOutput<
    'Battery',
    ['A', 'Ah', 'J', 'degC', 'V', 'V', 'V', 'V', 's', '%', '', '', '', '', '%'],
    [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]
  >;
  LNED: CommonSampleOutput<
    'Local Position NED',
    ['s', 'm', 'm', 'm', 'm/s', 'm/s', 'm/s'],
    [number, number, number, number, number, number, number]
  >;
  LSKP: CommonSampleOutput<
    'LRV Frame Skip',
    never,
    number,
    {
      LRVO: 0;
      LRVS: 1;
    }
  >;
  MAGN: CommonSampleOutput<
    'Magnetometer',
    'μT',
    [number, number, number]
  >;
  MSKP: CommonSampleOutput<
    'MRV Frame Skip',
    never,
    number
  >;
  MWET: CommonSampleOutput<
    'Microphone Wet[mic_wet, all_mics, confidence]',
    never,
    number
  >;
  SCEN: CommonSampleOutput<
    'Scene classification  | CLASSIFIER (snow,urban,indoor,water,vegetation,beach)',
    ['prob'],
    [number, number, number, number, number, number]
  >;
  SCPR: CommonSampleOutput<
    'Scaled Pressure',
    ['s', 'Pa', 'Pa', 'degC'],
    null | [number, number, number, number]
  >;
  SHUT: CommonSampleOutput<
    'Exposure time (shutter speed)',
    's',
    number
  >;
  SIMU: CommonSampleOutput<
    'Scaled IMU',
    ['s', 'g', 'g', 'g', 'rad/s', 'rad/s', 'rad/s', 'T', 'T', 'T'],
    [number, number, number, number, number, number, number, number, number, number]
  >;
  SROT: CommonSampleOutput<
    'Sensor read out time',
    never,
    number
  >;
  SYST: CommonSampleOutput<
    'System time',
    ['ss'],
    [bigint, bigint]
  >;
  VFRH: CommonSampleOutput<
    'VFR HUD',
    ['m/s', 'm/s', 'm', 'm/s', 'deg', '%'],
    [number, number, number, number, number, number]
  >;
  UNIF: CommonSampleOutput<
    'Image uniformity',
    never,
    number
  >;
  WBAL: CommonSampleOutput<
    'White Balance temperature (Kelvin)',
    never,
    number
  >;
  WNDM: CommonSampleOutput<
    'Wind Processing[wind_enable, meter_value(0 - 100)]',
    never,
    number
  >;
  WRGB: CommonSampleOutput<
    'White Balance RGB gains',
    never,
    [number, number, number]
  >;
  YAVG: CommonSampleOutput<
    'Average luminance',
    never,
    number
  >;
}

interface SampleOutputFromType {
  AALP: 'AALP';
  ACCL: 'ACCL';
  ATTD: 'ATTD';
  ATTR: 'ATTR';
  BPOS: 'BPOS';
  CSEN: 'CSEN';
  CYTS: 'CYTS';
  CORI: 'CORI';
  ESCS: 'ESCS';
  FACE: 'FACE' | 'FACE1' | 'FACE2' | 'FACE3' | 'FACE4' | 'FACE5' | 'FACE6' | 'FACE7' | 'FACE8' | 'FACE9';
  FWVS: 'FWVS';
  GPS: 'GPS5' | 'GPS9';
  GPS5: 'GPS5';
  GPS9: 'GPS9';
  GLPI: 'GLPI';
  GLPR: 'GLPR';
  GRAV: 'GRAV';
  GYRO: 'GYRO';
  HLMT: 'HLMT';
  HUES: 'HUES';
  IORI: 'IORI';
  ISOE: 'ISOE';
  ISOG: 'ISOG';
  KBAT: 'KBAT';
  LNED: 'LNED';
  LSKP: 'LSKP';
  MAGN: 'MAGN';
  MSKP: 'MSKP';
  MWET: 'MWET';
  SCEN: 'SCEN';
  SCPR: 'SCPR';
  SHUT: 'SHUT';
  SIMU: 'SIMU';
  SROT: 'SROT';
  SYST: 'SYST';
  VFRH: 'VFRH';
  UNIF: 'UNIF';
  WBAL: 'WBAL';
  WNDM: 'WNDM';
  WRGB: 'WRGB';
  YAVG: 'YAVG';
}

interface GoProTelemetryResultByPreset {
  csv: string;
  gpx: string;
  kml: string;
  virb: string;
  mgjson: MGJson;
  geojson: GeoJSON;
}

type GoProTelemetryResult<
  O extends GoProTelemetryOptions
  > = O extends GoProTelemetryPresetLessOptions
  ? GoProTelemetryDefaultResult<O>
  : O['preset'] extends keyof GoProTelemetryResultByPreset
    ? GoProTelemetryResultByPreset[O['preset']]
    : never;

/**
 *
 * @param input
 * @param options
 * @returns This function returns a promise of **streams** object.
 * To access any stream, use `results[deviceID]`. Usually there is deviceID `1`, but sometimes there is also an arbitrary number too.
 */
declare function GoProTelemetry<O extends GoProTelemetryOptions>(
  input: GoProTelemetryInput,
  options?: O,
): Promise<GoProTelemetryResult<O>>;
declare function GoProTelemetry<O extends GoProTelemetryOptions>(
  input: GoProTelemetryInput,
  options: O,
  callback: (data: GoProTelemetryResult<O>) => void,
): void;

export default GoProTelemetry;
declare const goProTelemetry: typeof GoProTelemetry;
export { GoProTelemetry, goProTelemetry };

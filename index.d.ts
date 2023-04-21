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
  stream?: (keyof SampleOutputByType) | (keyof SampleOutputByType)[];
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


interface GoProTelemetryDefaultResult<O extends GoProTelemetryPresetLessOptions> {
  [key: number]: {
    'device name': string;
    streams: {
      [K in ((keyof SampleOutputByType) & ExtractStreamType<O>)]?: SampleOutputByType[K];
    }[];
  };
}

interface CommonSampleOutput {
  name: string;
  units?: string | string[];
  samples: {
    cts: number;
    date: Date;
  }[];
}

// TODO: This list is not complete, please help by completing it
interface SampleOutputByType {
  AALP: {
    name: 'AGC audio level[rms_level ,peak_level]';
    units: 'dBFS';
    samples: {
      value: number;
    };
  } & CommonSampleOutput;
  ACCL: {
    name: 'Accelerometer' | 'Accelerometer (z,x,y)' | 'Accelerometer (up/down, right/left, forward/back)';
    units: 'm/s²';
    samples: {
      value: [number, number, number];
    }[];
    sticky?: {
      'temperature [°C]': number;
    };
  } & CommonSampleOutput;
  ATTD: {
    name: 'Attitude';
    units: ['s', 'rad', 'rad', 'rad', 'rad/s', 'rad/s', 'rad/s', ''];
    samples: {
      value: [number, number, number, number, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  ATTR: {
    name: 'Attitude Target';
    units: ['s', 'rad', 'rad', 'rad', ''];
    samples: {
      value: [number | bigint, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  BPOS: {
    name: 'Controller';
    units: ['deg', 'deg', 'm', 'deg', 'deg', 'm', 'm', 'm'];
    samples: {
      value: [number, number, number, number, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  CSEN: {
    name: 'Coyote Sense';
    units: ['s', 'rad/s', 'rad/s', 'rad/s', 'g', 'g', 'g', '', '', '', ''];
    samples: {
      value: [number, number, number, number, number, number, number, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  CYTS: {
    name: 'Coyote Status';
    units: ['s', '', '', '', '', 'rad', 'rad', 'rad', '', ''];
    samples: {
      value: [number, number, number, number, number, number, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  CORI: {
    name: 'CameraOrientation';
    samples: {
      value: [number, number, number, number];
    }[];
  } & CommonSampleOutput;
  DEVC: {} & CommonSampleOutput;
  DISP: {} & CommonSampleOutput;
  DVID: {} & CommonSampleOutput;
  DVNM: {} & CommonSampleOutput;
  EMPT: {} & CommonSampleOutput;
  ESCS: {
    name: 'ESC Status';
    units: ['s', 'rpm', 'rpm', 'rpm', 'rpm', 'rpm', 'rpm', 'rpm', 'rpm', 'degC', 'degC', 'degC', 'degC', 'V', 'V', 'V', 'V', 'A', 'A', 'A', 'A', '', '', '', '', '', '', '', '', ''];
    samples: {
      value: number[];
    }[];
  } & CommonSampleOutput;
  FACE: {
    name: 'Face Coordinates and details (x,y,w,h,unknown,smile)';
    subStreamName: `ID:${number}`;
    samples: {
      value: [number, number, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  FACE1: SampleOutputByType['FACE'];
  FACE2: SampleOutputByType['FACE'];
  FACE3: SampleOutputByType['FACE'];
  FACE4: SampleOutputByType['FACE'];
  FACE5: SampleOutputByType['FACE'];
  FACE6: SampleOutputByType['FACE'];
  FACE7: SampleOutputByType['FACE'];
  FACE8: SampleOutputByType['FACE'];
  FACE9: SampleOutputByType['FACE'];
  //FCNM: {} & CommonSampleOutput;
  FWVS: {
    name: 'FWVS';
    samples: [{
      value: string;
    }];
  } & CommonSampleOutput;
  GPS5: {
    name: 'GPS (Lat., Long., Alt., 2D speed, 3D speed)';
    units: ['deg', 'deg', 'm', 'm/s', 'm/s'];
    samples: {
      value: [number, number, number, number, number];
      sticky?: {
        fix: number;
        precision: number;
        'altitude system'?: 'MSLV';
      };
    }[];
  } & CommonSampleOutput;
  GPS9: {
    name: 'GPS (Lat., Long., Alt., 2D, 3D, days, secs, DOP, fix)';
    units: ['deg', 'deg', 'm', 'm/s', 'm/s', '', 'secs', '', ''];
    samples: {
      value: [number, number, number, number, number, number, number, number, number];
      sticky?: {
        'altitude system': 'MSLV';
      };
    }[];
  } & CommonSampleOutput;
  GPSF: {} & CommonSampleOutput;
  GPSP: {} & CommonSampleOutput;
  GPSU: {} & CommonSampleOutput;
  GLPI: {
    name: 'Position';
    units: ['s', 'deg', 'deg', 'm', 'm', 'm/s', 'm/s', 'm/s', 'deg'];
    samples: {
      value: [number, number, number, number, number, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  GLPR: {
    name: 'GPS RAW';
    units: ['s', 'deg', 'deg', 'm', 'm', 'm', 'm/s', 'deg', '', ''];
    samples: {
      value: [number, number, number, number, number, number, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  GRAV: {
    name: 'Gravity Vector';
    samples: {
      value: [number, number, number];
    }[];
  } & CommonSampleOutput;
  GYRO: {
    name: 'Gyroscope' | 'Gyroscope (z,x,y)';
    units: 'rad/s';
    samples: {
      value: [number, number, number];
      sticky?: {
        'temperature [°C]': number;
      };
    }[];
  } & CommonSampleOutput;
  HLMT: {
    name: 'Highlights';
    units: ['ms', 'ms', 'ms', 'deg', 'deg', 'm', '_', '%', '_'];
    samples: {
      value: [number, number, number, number, number, number, string, number, number];
    }[];
  } & CommonSampleOutput;
  HUES: {
    name: 'Predominant hue  | hue (253,49,172)';
    units: ['weight'];
    samples: {
      value: [number, number, number];
    }[];
  } & CommonSampleOutput;
  IORI: {
    name: 'ImageOrientation';
    samples: {
      value: [number, number, number, number];
    }[];
  } & CommonSampleOutput;
  ISOE: {
    name: 'Sensor ISO';
    samples: {
      value: number;
    }[];
  } & CommonSampleOutput;
  ISOG: {
    name: 'Sensor gain (ISO x100)';
    samples: {
      value: number;
    }[];
  } & CommonSampleOutput;
  KBAT: {
    name: 'Battery';
    units: ['A', 'Ah', 'J', 'degC', 'V', 'V', 'V', 'V', 's', '%', '', '', '', '', '%'];
    samples: {
      value: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  LNED: {
    name: 'Local Position NED';
    units: ['s', 'm', 'm', 'm', 'm/s', 'm/s', 'm/s'];
    samples: {
      value: [number, number, number, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  LSKP: {
    name: 'LRV Frame Skip';
    samples: {
      value: number;
      sticky?: {
        LRVO: 0;
        LRVS: 1;
      };
    }[];
  } & CommonSampleOutput;
  MAGN: {
    name: 'Magnetometer';
    units: 'μT';
    samples: {
      value: [number, number, number];
    }[];
  } & CommonSampleOutput;
  MSKP: {
    name: 'MRV Frame Skip';
    samples: {
      value: number;
    }[];
  } & CommonSampleOutput;
  MWET: {
    name: 'Microphone Wet[mic_wet, all_mics, confidence]';
    samples: {
      value: number;
    }[];
  } & CommonSampleOutput;
  //RMRK: {} & CommonSampleOutput;
  //SCAL: {} & CommonSampleOutput;
  SCEN: {
    name: 'Scene classification  | CLASSIFIER (snow,urban,indoor,water,vegetation,beach)';
    units: ['prob'];
    samples: {
      value: [number, number, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  SCPR: {
    name: 'Scaled Pressure';
    units: ['s', 'Pa', 'Pa', 'degC'];
    samples: {
      value: null | [number, number, number, number];
    }[];
  } & CommonSampleOutput;
  SHUT: {
    name: 'Exposure time (shutter speed)';
    units: 's';
    samples: {
      value: number;
    }[];
  } & CommonSampleOutput;
  SIMU: {
    name: 'Scaled IMU';
    units: ['s', 'g', 'g', 'g', 'rad/s', 'rad/s', 'rad/s', 'T', 'T', 'T'];
    samples: {
      value: [number, number, number, number, number, number, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  //SIUN: {} & CommonSampleOutput;
  SROT: {
    name: 'Sensor read out time';
    samples: {
      value: number;
    }[];
  } & CommonSampleOutput;
  //STMP: {} & CommonSampleOutput;
  //STNM: {} & CommonSampleOutput;
  //STRM: {} & CommonSampleOutput;
  SYST: {
    name: 'System time';
    units: ['ss'];
    samples: {
      value: [bigint, bigint];
    }[];
  } & CommonSampleOutput;
  VFRH: {
    name: 'VFR HUD';
    units: ['m/s', 'm/s', 'm', 'm/s', 'deg', '%'];
    samples: {
      value: [number, number, number, number, number, number];
    }[];
  } & CommonSampleOutput;
  //TIMO: {} & CommonSampleOutput;
  //TSMP: {} & CommonSampleOutput;
  //TYPE: {} & CommonSampleOutput;
  UNIF: {
    name: 'Image uniformity';
    samples: {
      value: number;
    }[];
  } & CommonSampleOutput;
  //UNIT: {} & CommonSampleOutput;
  WBAL: {
    name: 'White Balance temperature (Kelvin)';
    samples: {
      value: number;
    }[];
  } & CommonSampleOutput;
  WNDM: {
    name: 'Wind Processing[wind_enable, meter_value(0 - 100)]';
    samples: {
      value: number;
    }[];
  } & CommonSampleOutput;
  WRGB: {
    name: 'White Balance RGB gains';
    samples: {
      value: [number, number, number];
    }[];
  } & CommonSampleOutput;
  YAVG: {
    name: 'Average luminance';
    samples: {
      value: number;
    }[];
  } & CommonSampleOutput;
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

declare function GoProTelemetry<O extends GoProTelemetryOptions = {}>(
  input: GoProTelemetryInput,
  options?: O,
): Promise<GoProTelemetryResult<O>>;
declare function GoProTelemetry<O extends GoProTelemetryOptions = {}>(
  input: GoProTelemetryInput,
  options: O,
  callback: (data: GoProTelemetryResult<O>) => void,
): void;

export default GoProTelemetry;
declare const goProTelemetry: typeof GoProTelemetry;
export { GoProTelemetry, goProTelemetry };

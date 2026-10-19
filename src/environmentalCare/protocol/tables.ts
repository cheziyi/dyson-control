import type { Filter } from "../models/capabilities.js";
import type {
  AirQualityTarget,
  CleanCycleState,
  FanAirDirection,
  FindAndFollowMode,
  FocusDiffuse,
  HeatMode,
  HumidificationMode,
  InnerFilterType,
  NozzleAngle,
  OscillationAngles,
  OscillationMode,
  OscillationPresetAngle,
  OscillationState,
  OuterFilterType,
  TemperatureUnit,
  TiltAngle,
  WaterHardness,
  WickDryingSpeed,
  WickDryingState,
} from "../models/state.js";

// The types, messages, fields and codes of an environmental care machine.
// Each entry has Dyson's own name for it, written out in full.

/** The types of the first generation. One holds its power and its auto mode
 * in one field, `fanMode`, and counts a temperature from 273 K. */
export const ENVIRONMENTAL_CARE_GENERATION_1_TYPES: readonly string[] = [
  "455",
  "455C",
  "469",
  "475",
];

/** The types of every later generation, which hold their power in
 * `fanPower`. */
export const ENVIRONMENTAL_CARE_LATER_TYPES: readonly string[] = [
  "358",
  "358E",
  "358K",
  "438",
  "438E",
  "438K",
  "520",
  "527",
  "527E",
  "527K",
  "635",
  "664",
  "739",
  "831",
  "897",
  "917",
  "918",
  "949",
  "960",
  "965",
  "994",
  "997",
  "1018",
];

/** The later types that have no auto mode, and so no `autoMode` field. */
export const ENVIRONMENTAL_CARE_TYPES_WITHOUT_AUTO_MODE: readonly string[] = [
  "635",
  "739",
  "949",
  "960",
];

/** The types that have no continuous monitoring, and so no `rhtm`. */
export const ENVIRONMENTAL_CARE_TYPES_WITHOUT_CONTINUOUS_MONITORING: readonly string[] =
  ["739", "960"];

/** The types that take a `heatMode` and a target temperature. */
export const ENVIRONMENTAL_CARE_TYPES_WITH_HEAT_MODE: readonly string[] = [
  "455",
  "527",
  "527E",
  "527K",
  "635",
  "918",
];

/** The types that take a `fanAirDirection`, unless their variant is in
 * `ENVIRONMENTAL_CARE_VARIANTS_WITHOUT_FAN_AIR_DIRECTION`. */
export const ENVIRONMENTAL_CARE_TYPES_WITH_FAN_AIR_DIRECTION: readonly string[] =
  ["358", "358E", "358K", "438", "438E", "438K", "520", "527", "527E", "527K"];

/** Each a type and its variant joined, as Dyson names a variant: a `438` of
 * variant `M` is a `438M`. */
export const ENVIRONMENTAL_CARE_VARIANTS_WITHOUT_FAN_AIR_DIRECTION: readonly string[] =
  ["438M", "527M"];

/** The types that take a `humidificationMode` and a
 * `manualHumidificationTargetInPercent`. */
export const ENVIRONMENTAL_CARE_TYPES_WITH_HUMIDIFICATION_MODE: readonly string[] =
  ["358", "358E", "358K", "965"];

export const ENVIRONMENTAL_CARE_TYPES_WITH_AUTO_HUMIDIFICATION: readonly string[] =
  ["358", "358E", "358K"];

export const ENVIRONMENTAL_CARE_TYPES_WITH_BARREL_OSCILLATION: readonly string[] =
  ["358", "358E", "358K"];

export const ENVIRONMENTAL_CARE_BARREL_OSCILLATION_PRESET_ANGLES: readonly OscillationPresetAngle[] =
  [45, 90, "breeze"];

/** The preset angles of an advanced oscillation whose firmware takes no two
 * angles of its own. */
export const ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_PRESET_ANGLES: readonly OscillationPresetAngle[] =
  [45, 90, 180, 350];

/** The widest angles of an advanced oscillation whose firmware takes any
 * two angles of its own. */
export const ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_RANGE: Readonly<OscillationAngles> =
  { lowerInDegrees: 5, upperInDegrees: 355 };

/** The upper angle less the lower of an advanced oscillation whose firmware
 * takes two angles of its own: one direction, or a preset angle's width. */
export const ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_ANGLE_WIDTHS: readonly number[] =
  [0, 45, 90, 180, 350];

/** The preset angles, the widest angles and their widths of an advanced
 * oscillation in place of the advanced ones, for the types in
 * `ENVIRONMENTAL_CARE_TYPES_WITH_NARROW_OSCILLATION`. */
export const ENVIRONMENTAL_CARE_NARROW_OSCILLATION_PRESET_ANGLES: readonly OscillationPresetAngle[] =
  [15, 40, 70];

export const ENVIRONMENTAL_CARE_NARROW_OSCILLATION_RANGE: Readonly<OscillationAngles> =
  { lowerInDegrees: 145, upperInDegrees: 215 };

export const ENVIRONMENTAL_CARE_NARROW_OSCILLATION_ANGLE_WIDTHS: readonly number[] =
  [0];

export const ENVIRONMENTAL_CARE_TYPES_WITH_NARROW_OSCILLATION: readonly string[] =
  ["635", "739"];

/** The types that tilt on their axis, through `oton` in place of `oson`. */
export const ENVIRONMENTAL_CARE_TYPES_WITH_TILT_OSCILLATION: readonly string[] =
  ["664"];

/** Of the later types without a barrel or a tilt oscillation, those that
 * do not oscillate on and off alone. */
export const ENVIRONMENTAL_CARE_TYPES_WITHOUT_BASIC_OSCILLATION: readonly string[] =
  ["897", "965"];

/** Of the later types without a barrel or a tilt oscillation, those that
 * take no oscillation angles, whatever their firmware can do. */
export const ENVIRONMENTAL_CARE_TYPES_WITHOUT_ADVANCED_OSCILLATION: readonly string[] =
  ["965", "997", "1018"];

export const ENVIRONMENTAL_CARE_TYPES_WITHOUT_AIR_QUALITY_SENSOR: readonly string[] =
  ["739", "960"];

/** The later types that have no filter whose life they report. */
export const ENVIRONMENTAL_CARE_TYPES_WITHOUT_FILTER_LIFE: readonly string[] = [
  "635",
  "739",
  "949",
  "960",
  "965",
];

/** The types that run a clean cycle, and so take a `waterHardness`. */
export const ENVIRONMENTAL_CARE_TYPES_WITH_CLEAN_CYCLE: readonly string[] = [
  "358",
  "358E",
  "358K",
  "965",
];

/** Each a type and its variant joined, as in
 * `ENVIRONMENTAL_CARE_VARIANTS_WITHOUT_FAN_AIR_DIRECTION`. */
export const ENVIRONMENTAL_CARE_VARIANTS_WITH_FIND_AND_FOLLOW: readonly string[] =
  ["438N", "527N"];

export const ENVIRONMENTAL_CARE_TYPES_WITH_CHILD_LOCK: readonly string[] = [
  "635",
  "739",
  "918",
  "965",
  "997",
  "1018",
];

/** The later types that take no `temperatureUnit`. A machine of the first
 * generation takes none either: its unit follows its serial number, which
 * is Fahrenheit for a US one. */
export const ENVIRONMENTAL_CARE_TYPES_WITHOUT_TEMPERATURE_UNIT: readonly string[] =
  ["739", "897", "917", "949", "960", "997", "1018"];

/** Each a type and its variant joined, as in
 * `ENVIRONMENTAL_CARE_VARIANTS_WITHOUT_FAN_AIR_DIRECTION`. */
export const ENVIRONMENTAL_CARE_VARIANTS_WITHOUT_TEMPERATURE_UNIT: readonly string[] =
  ["438M"];

export const ENVIRONMENTAL_CARE_TYPES_WITH_NOZZLE_ANGLE: readonly string[] = [
  "831",
];

export const ENVIRONMENTAL_CARE_TYPES_WITH_FOCUS_DIFFUSE: readonly string[] = [
  "455",
];

export const ENVIRONMENTAL_CARE_TYPES_WITH_WICK_DRYING: readonly string[] = [
  "965",
];

/** The models that take a `uvMode` and an `ionisationMode`, of any type but
 * those in `ENVIRONMENTAL_CARE_TYPES_WITHOUT_UV_AND_IONISATION_BY_MODEL`. */
export const ENVIRONMENTAL_CARE_MODELS_WITH_UV_AND_IONISATION: readonly string[] =
  ["BP10-BA"];

export const ENVIRONMENTAL_CARE_TYPES_WITHOUT_UV_AND_IONISATION_BY_MODEL: readonly string[] =
  ["831"];

/** Each a type and its model joined by a slash: a `917` of model `EAST` is
 * a `917/EAST`. */
export const ENVIRONMENTAL_CARE_TYPE_MODELS_WITH_UV_AND_IONISATION: readonly string[] =
  ["917/EAST", "918/EAST", "994/MP01-BA", "997/EAST"];

/** The types that take a `uvMode` whatever their model. */
export const ENVIRONMENTAL_CARE_TYPES_WITH_UV: readonly string[] = ["997"];

/** What a machine's firmware can do, as the cloud names it. A later type
 * with either oscillation capability takes oscillation angles: a preset in
 * `ancp` with `advanceOscillationDay0` alone, and two in `osal` and
 * `osau` with `advanceOscillationDay1`. */
export const ENVIRONMENTAL_CARE_FIRMWARE_CAPABILITIES = {
  advanceOscillationDay0: "AdvanceOscillationDay0",
  advanceOscillationDay1: "AdvanceOscillationDay1",
} as const;

/** `msg` of a message sent to a machine. */
export const ENVIRONMENTAL_CARE_COMMANDS = {
  requestCurrentState: "REQUEST-CURRENT-STATE",
  requestProductEnvironmentCurrentSensorData:
    "REQUEST-PRODUCT-ENVIRONMENT-CURRENT-SENSOR-DATA",
  requestCurrentFaults: "REQUEST-CURRENT-FAULTS",
  stateSet: "STATE-SET",
} as const;

/** `msg` of a message a machine sends. A `FAULTS-CHANGE` holds each fault
 * as its old value and its new one, as a `STATE-CHANGE` holds a field. */
export const ENVIRONMENTAL_CARE_MESSAGES = {
  currentState: "CURRENT-STATE",
  stateChange: "STATE-CHANGE",
  environmentalCurrentSensorData: "ENVIRONMENTAL-CURRENT-SENSOR-DATA",
  currentFaults: "CURRENT-FAULTS",
  faultsChange: "FAULTS-CHANGE",
} as const;

/** What follows the root topic level and the serial number in the topic a
 * machine reports its faults on, beside the one it reports its state and
 * its sensors on. */
export const ENVIRONMENTAL_CARE_FAULTS_TOPIC = "status/faults";

/** The fields of `product-state`. A machine of the first generation reports
 * `fanMode` in place of `fanPower` and `autoMode`, and `filterLife` in place
 * of the inner and the outer filter's. Find and follow takes its mode and
 * reports its state in fields of its own, with the codes of the
 * oscillation's. */
export const ENVIRONMENTAL_CARE_FIELDS = {
  fanPower: "fpwr",
  autoMode: "auto",
  fanMode: "fmod",
  fanSpeed: "fnsp",
  oscillationMode: "oson",
  oscillationState: "oscs",
  oscillationAngleLowerBoundary: "osal",
  oscillationAngleUpperBoundary: "osau",
  oscillationAngle: "ancp",
  tiltMode: "oton",
  tiltOscillationState: "otcs",
  tiltType: "anct",
  tiltLowerAngle: "otal",
  tiltUpperAngle: "otau",
  findAndFollowMode: "soon",
  findAndFollowState: "sost",
  nightMode: "nmod",
  continuousMonitoring: "rhtm",
  sleepTimer: "sltm",
  fanAirDirection: "fdir",
  heatMode: "hmod",
  targetTemperature: "hmax",
  humidificationMode: "hume",
  autoHumidification: "haut",
  manualHumidificationTarget: "humt",
  cleanCycleState: "clcr",
  remainingTimeToNextCleanCycle: "cltr",
  remainingTimeOfActiveCleanCycle: "cdrr",
  intervalBetweenCleanCycles: "wath",
  childLockMode: "ctll",
  temperatureUnit: "corf",
  nozzleAngle: "noan",
  focusDiffuse: "ffoc",
  airQualityTarget: "qtar",
  wickDryingMode: "wdmd",
  wickDryingSpeed: "wdsp",
  wickDryingState: "wdst",
  wickDryingTimeRemaining: "wdtr",
  heatState: "hsta",
  humidificationState: "msta",
  uvMode: "uvse",
  ionisationMode: "ioni",
  filterLife: "filf",
  innerFilterLife: "cflr",
  outerFilterLife: "hflr",
  innerFilterType: "cflt",
  outerFilterType: "hflt",
} as const;

/** The field each filter's life is reset by, with
 * `ENVIRONMENTAL_CARE_RESET_FILTER_LIFE_CODE`. */
export const ENVIRONMENTAL_CARE_RESET_FILTER_LIFE_FIELDS: Readonly<
  Record<Filter, string>
> = {
  filter: "rstf",
  innerFilter: "rscf",
  outerFilter: "rshf",
};

export const ENVIRONMENTAL_CARE_RESET_FILTER_LIFE_CODE = "RSTF";

/** The highest `filterLife` in hours, of a filter that is new. */
export const ENVIRONMENTAL_CARE_FILTER_LIFE_IN_HOURS = 4300;

/** The fields of the `data` of a sensors message. A high-resolution field is
 * a concentration: micrograms per cubic metre, or parts per million for
 * carbon dioxide. Every other pollutant field is an index, in tenths. A
 * machine of the first generation reports its sleep timer here. */
export const ENVIRONMENTAL_CARE_SENSOR_FIELDS = {
  temperature: "tact",
  humidity: "hact",
  pm25: "pm25",
  highResolutionPm25: "p25r",
  pm10: "pm10",
  highResolutionPm10: "p10r",
  generation2VolatileOrganicCompounds: "va10",
  nitrogenDioxide: "noxl",
  formaldehyde: "hcho",
  highResolutionFormaldehyde: "hchr",
  carbonDioxide: "co2a",
  highResolutionCarbonDioxide: "co2r",
  sleepTimer: "sltm",
} as const;

/** The codes of a field that is on or off: `fanPower`, `autoMode`,
 * `nightMode`, `continuousMonitoring` and `autoHumidification`. `off` is
 * also the code of a sleep timer that is not running. */
export const ENVIRONMENTAL_CARE_SWITCH_CODES = {
  on: "ON",
  off: "OFF",
} as const;

/** The codes of `fanMode`: `fan` is a machine that is on at a set speed. */
export const ENVIRONMENTAL_CARE_FAN_MODE_CODES = {
  off: "OFF",
  fan: "FAN",
  auto: "AUTO",
} as const;

export const ENVIRONMENTAL_CARE_OSCILLATION_MODE_CODES: Readonly<
  Record<OscillationMode, string>
> = {
  off: "OFF",
  on: "ON",
  idleOff: "OIOF",
  idleOn: "OION",
  scan: "SCAN",
};

export const ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_CODES: Readonly<
  Record<FanAirDirection, string>
> = {
  forward: "ON",
  backward: "OFF",
};

export const ENVIRONMENTAL_CARE_HEAT_MODE_CODES: Readonly<
  Record<HeatMode, string>
> = {
  off: "OFF",
  heat: "HEAT",
};

export const ENVIRONMENTAL_CARE_HUMIDIFICATION_MODE_CODES: Readonly<
  Record<HumidificationMode, string>
> = {
  off: "OFF",
  humidify: "HUMD",
};

/** The codes of `oscillationState`, and of `findAndFollowState`. */
export const ENVIRONMENTAL_CARE_OSCILLATION_STATE_CODES: Readonly<
  Record<OscillationState, string>
> = {
  on: "ON",
  off: "OFF",
  idle: "IDLE",
  invalid: "INV",
  init: "INIT",
  scan: "SCAN",
  acs: "ACS",
  acm: "ACM",
  nod: "NOD",
};

export const ENVIRONMENTAL_CARE_FIND_AND_FOLLOW_MODE_CODES: Readonly<
  Record<FindAndFollowMode, string>
> = {
  off: "OFF",
  on: "ON",
  scan: "SCAN",
};

/** The codes of `tiltType`: `breeze` tilts the machine back and forth, and
 * `custom` holds it at `tiltLowerAngle`, which `tiltUpperAngle` equals. */
export const ENVIRONMENTAL_CARE_TILT_TYPE_CODES = {
  breeze: "BRZE",
  custom: "CUST",
} as const;

/** The angle a tilt is written with, in degrees: `tiltLowerAngle` and
 * `tiltUpperAngle` both take it. A `breeze` sends `0359`. */
export const ENVIRONMENTAL_CARE_TILT_ANGLE_CODES: Readonly<
  Record<TiltAngle, number>
> = {
  0: 0,
  25: 25,
  50: 50,
  breeze: 359,
};

/** The tilt angle that blows the air backward: the machine is written
 * `fanAirDirection` `backward` with it, and `forward` with every other. */
export const ENVIRONMENTAL_CARE_BACKWARD_TILT_ANGLE: TiltAngle = 50;

export const ENVIRONMENTAL_CARE_CLEAN_CYCLE_STATE_CODES: Readonly<
  Record<CleanCycleState, string>
> = {
  setup: "CLSE",
  active: "CLAC",
  paused: "CLPA",
  incomplete: "CLIC",
  complete: "CLCM",
  notInCleanCycle: "CLNO",
};

/** The `intervalBetweenCleanCycles` each water hardness sets, in hours. */
export const ENVIRONMENTAL_CARE_WATER_HARDNESS_INTERVALS_IN_HOURS: Readonly<
  Record<WaterHardness, number>
> = {
  soft: 2025,
  medium: 1350,
  hard: 675,
};

export const ENVIRONMENTAL_CARE_TEMPERATURE_UNIT_CODES: Readonly<
  Record<TemperatureUnit, string>
> = {
  celsius: "ON",
  fahrenheit: "OFF",
};

export const ENVIRONMENTAL_CARE_NOZZLE_ANGLE_CODES: Readonly<
  Record<NozzleAngle, string>
> = {
  direct: "0000",
  indirect: "0045",
};

export const ENVIRONMENTAL_CARE_FOCUS_DIFFUSE_CODES: Readonly<
  Record<FocusDiffuse, string>
> = {
  focus: "ON",
  diffuse: "OFF",
};

/** The index each air quality target is written as, in four digits. */
export const ENVIRONMENTAL_CARE_AIR_QUALITY_TARGET_CODES: Readonly<
  Record<AirQualityTarget, number>
> = {
  good: 4,
  sensitive: 3,
  verySensitive: 1,
};

export const ENVIRONMENTAL_CARE_WICK_DRYING_SPEED_CODES: Readonly<
  Record<WickDryingSpeed, string>
> = {
  slow: "SLOW",
  normal: "NORM",
  fast: "FAST",
};

export const ENVIRONMENTAL_CARE_WICK_DRYING_STATE_CODES: Readonly<
  Record<WickDryingState, string>
> = {
  idle: "IDLE",
  wickDrying: "WDRY",
};

export const ENVIRONMENTAL_CARE_INNER_FILTER_TYPE_CODES: Readonly<
  Record<InnerFilterType, string>
> = {
  carbon: "CARF",
  sco: "SCOF",
  scog: "SCOG",
  scoh: "SCOH",
  car1: "CAR1",
  none: "NONE",
};

export const ENVIRONMENTAL_CARE_OUTER_FILTER_TYPE_CODES: Readonly<
  Record<OuterFilterType, string>
> = {
  hepa: "GHEP",
  hepaPtfe: "PHEP",
  gcom: "GCOM",
  pcom: "PCOM",
  gcok: "GCOK",
  pcok: "PCOK",
  ehep: "EHEP",
  hsco: "HSCO",
  estf: "ESTF",
  esco: "ESCO",
  ecar: "ECAR",
  escc: "ESCC",
  none: "NONE",
};

/** The groups of a faults message, each a fault's code -> its value. */
export const ENVIRONMENTAL_CARE_FAULT_GROUPS = {
  productErrors: "product-errors",
  productWarnings: "product-warnings",
  moduleErrors: "module-errors",
  moduleWarnings: "module-warnings",
} as const;

/** The value of a fault the machine has: every other is `OK`. */
export const ENVIRONMENTAL_CARE_FAULT_FAIL_CODE = "FAIL";

/** Each fault's code -> Dyson's name for it, whichever group reports it. */
export const ENVIRONMENTAL_CARE_FAULTS: Readonly<Record<string, string>> = {
  amf1: "airflowMotorFocDuration",
  amf2: "airflowMotorOverVolt",
  amf3: "airflowMotorUnderVolt",
  amf4: "airflowMotorOverTemperature",
  amf5: "airflowMotorStartUp",
  amf6: "airflowMotorSpeedFeedback",
  amf7: "airflowMotorOverCurrent",
  amf8: "airflowMotorSoftwareError",
  amf9: "airflowMotorInvalid",
  fmco: "motorController",
  stto: "bldcStallTimeout",
  hall: "bldcHallMonitor",
  hamp: "bldcOverCurrent",
  stal: "bldcStallCurrent",
  shrt: "bldcShortCurrent",
  cnfg: "bldcConfigError",
  com1: "communicationsAirflowMotor",
  com2: "wifiModuleFail",
  com3: "heaterCommunicationsFailure",
  com4: "communicationsAirflowMotorBootFailure",
  com6: "heaterBootFailure",
  com7: "coreConnectionIntermittent",
  com8: "receiveBufferOverflow",
  wdog: "watchDogReset",
  ibus: "i2cBus",
  ilss: "illegalSystemState",
  fs00: "systemControllerFlashFailure",
  fs01: "flashMemoryFailure",
  nvmw: "nvmWrite",
  nvmr: "nvmRead",
  wfma: "wifiModuleAccess",
  wfhb: "wifiHeartbeat",
  wfcp: "connectionProtocol",
  hioc: "generation1HeaterInputOverCurrent",
  hilc: "generation1HeaterInputLowCurrent",
  htri: "generation1HeaterTriac",
  hamb: "generation1HeaterAmbientTemperatureLoss",
  povi: "generation1HeaterPlugOverCurrent",
  hctf: "generation1HeaterTriacCommunications",
  hvmi: "generation1HeaterTriacVariant",
  tilt: "generation1HeaterTiltDetection",
  ht01: "generation2HeaterInputOverCurrent",
  ht02: "generation2HeaterInputLowCurrent",
  ht03: "generation2HeaterTriac",
  ht04: "generation2HeaterPlugOverCurrent",
  ht05: "generation2HeaterTriacVariantMismatch",
  ht06: "generation2HeaterAmbientTemperatureLoss",
  ht07: "generation2HeaterTiltSensor",
  ht08: "generation2HeaterIllegalCountry",
  ht09: "generation2HeaterVariantIdError",
  ht0a: "generation2HeaterCurrentSensor",
  dsts: "particleSensor",
  vocs: "volatileOrganicCompoundsSensor",
  "t&hs": "temperatureHumiditySensor",
  sen1: "dustSensor",
  sen2: "gasSensor",
  sen3: "temperatureSensor",
  sen4: "humiditySensor",
  sen5: "filterPressureSensor",
  sen6: "filterAbsence",
  sen7: "formaldehydeModule",
  sen8: "carbonDioxideModule",
  sena: "fanSpeedSensor",
  fltr: "filterReplacement",
  ste1: "panOscillation",
  ste2: "flowAngle",
  bosl: "barrelOscillationLeft",
  bosr: "barrelOscillationRight",
  so01: "findAndFollowVisionModule",
  so02: "findAndFollowOscillationObstructed",
  uled: "uvcLed",
  uvc1: "uvSterilization",
  ion1: "ionization",
  wpmp: "waterPumpFailure",
  prot: "pumpRotor",
  tnke: "tankEmpty",
  tnkp: "tankUndetected",
  etwd: "evaporationTrayOverflowDetected",
  etws: "evaporationTrayOverflowExtended",
  cldu: "cleanCycleOverdue",
  szme: "moduleErrorExceedsAllocatedSizeBounds",
  szmw: "moduleWarningExceedsAllocatedSizeBounds",
  szps: "productStatusWarningExceedsAllocatedSizeBounds",
  szpe: "productErrorWarningExceedsAllocatedSizeBounds",
  szpw: "productWarningExceedsAllocatedSizeBounds",
  szed: "environmentalDataExceedsAllocatedSizeBounds",
  lspd: "environmentalDataLost",
  szpi: "productIdExceedsAllocatedSizeBounds",
  szpp: "productPasswordExceedsAllocatedSizeBounds",
  szhv: "productHardwareVersionExceedsAllocatedSizeBounds",
  szbv: "productBootloaderVersionExceedsAllocatedSizeBounds",
  szav: "productSoftwareVersionExceedsAllocatedSizeBounds",
  srnk: "serialCdpReceivedNak",
  stac: "serialCdpAckTimeout",
  strs: "serialCdpResponseTimeout",
  srmi: "serialCdpReceivedInvalidMessage",
  srmu: "serialCdpReceivedUnknownMessage",
  nwcs: "networkCloudConnectIssue",
  nwts: "timestampConnectIssue",
  nwps: "provisioningConnectIssue",
  nwss: "schedulerConnectIssue",
  nwds: "dialbackConnectIssue",
};

/** The codes of `oscillationAngle` that are no angle. An angle's code is its
 * degrees, in four digits: `0045`. `custom` is the code a write of
 * `oscillationAngles` sends with them. */
export const ENVIRONMENTAL_CARE_OSCILLATION_PRESET_ANGLE_CODES = {
  breeze: "BRZE",
  custom: "CUST",
} as const;

/** What a temperature in tenths of a kelvin is off from tenths of a degree
 * Celsius by. */
export const ENVIRONMENTAL_CARE_KELVIN_OFFSETS = {
  generation1: 273,
  later: 273.15,
} as const;

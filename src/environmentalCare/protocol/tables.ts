import type {
  FanAirDirection,
  HeatMode,
  HumidificationMode,
  OscillationMode,
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

/** The types that turn to a preset angle of 45 or 90 degrees, or breeze,
 * through `ancp`. */
export const ENVIRONMENTAL_CARE_TYPES_WITH_BARREL_OSCILLATION: readonly string[] =
  ["358", "358E", "358K"];

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

/** What a machine's firmware can do, as the cloud names it. A later type
 * with either oscillation capability takes oscillation angles: a preset in
 * `ancp` with `advanceOscillationDay0` alone, and any two in `osal` and
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
  stateSet: "STATE-SET",
} as const;

/** `msg` of a message a machine sends. */
export const ENVIRONMENTAL_CARE_MESSAGES = {
  currentState: "CURRENT-STATE",
  stateChange: "STATE-CHANGE",
  environmentalCurrentSensorData: "ENVIRONMENTAL-CURRENT-SENSOR-DATA",
} as const;

/** The fields of `product-state`. A machine of the first generation reports
 * `fanMode` in place of `fanPower` and `autoMode`. Dyson's names for the two
 * oscillation angles and the preset are not known: these three follow its
 * names for the tilt, `tiltLowerAngle` and `tiltUpperAngle`. */
export const ENVIRONMENTAL_CARE_FIELDS = {
  fanPower: "fpwr",
  autoMode: "auto",
  fanMode: "fmod",
  fanSpeed: "fnsp",
  oscillationMode: "oson",
  oscillationLowerAngle: "osal",
  oscillationUpperAngle: "osau",
  oscillationPresetAngle: "ancp",
  nightMode: "nmod",
  continuousMonitoring: "rhtm",
  sleepTimer: "sltm",
  fanAirDirection: "fdir",
  heatMode: "hmod",
  targetTemperature: "hmax",
  humidificationMode: "hume",
  autoHumidification: "haut",
  manualHumidificationTarget: "humt",
} as const;

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

/** `oscillationPresetAngle` for the two angles a write sets. */
export const ENVIRONMENTAL_CARE_CUSTOM_OSCILLATION_PRESET_ANGLE = "CUST";

/** What a temperature in tenths of a kelvin is off from tenths of a degree
 * Celsius by. */
export const ENVIRONMENTAL_CARE_KELVIN_OFFSETS = {
  generation1: 273,
  later: 273.15,
} as const;

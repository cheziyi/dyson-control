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

/** The types that heat the air, and so take a `heatMode` and a target
 * temperature. */
export const ENVIRONMENTAL_CARE_HEAT_TYPES: readonly string[] = [
  "455",
  "527",
  "527E",
  "527K",
  "635",
  "918",
];

/** The later types whose air blows forward or backward, and so take a
 * `fanAirDirection`. One whose type and variant join to an excluded name
 * carries none. */
export const ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_TYPES: readonly string[] = [
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
];

/** The joined type and variant names, such as `438M`, whose machines carry
 * no `fanAirDirection`. */
export const ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_EXCLUDED_VARIANTS: readonly string[] =
  ["438M", "527M"];

/** The types that humidify to a target set by hand, and so take a
 * `humidificationMode` and a `manualHumidificationTargetInPercent`. */
export const ENVIRONMENTAL_CARE_HUMIDIFICATION_TYPES: readonly string[] = [
  "358",
  "358E",
  "358K",
  "965",
];

/** The types that pick the humidification target themselves, and so take an
 * `autoHumidification`. */
export const ENVIRONMENTAL_CARE_AUTO_HUMIDIFICATION_TYPES: readonly string[] = [
  "358",
  "358E",
  "358K",
];

/** The types whose oscillation turns to a preset angle of 45 or 90 degrees,
 * or breezes, instead of sweeping. */
export const ENVIRONMENTAL_CARE_BARREL_OSCILLATION_TYPES: readonly string[] = [
  "358",
  "358E",
  "358K",
];

/** The types whose oscillation tilts the machine on its axis. */
export const ENVIRONMENTAL_CARE_TILT_OSCILLATION_TYPES: readonly string[] = [
  "664",
];

/** The types that carry no plain on-and-off oscillation. */
export const ENVIRONMENTAL_CARE_TYPES_WITHOUT_BASIC_OSCILLATION: readonly string[] =
  ["664", "897", "965"];

/** The types that carry no oscillation with settable angles, whatever their
 * capabilities report. */
export const ENVIRONMENTAL_CARE_TYPES_WITHOUT_ADVANCED_OSCILLATION: readonly string[] =
  ["358", "358E", "358K", "664", "965", "997", "1018"];

/** The capabilities of the cloud's manifest whose presence says a later
 * type's oscillation sweeps between settable angles. */
export const ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_CAPABILITIES: readonly string[] =
  ["AdvanceOscillationDay0", "AdvanceOscillationDay1"];

/** The types that have no air quality sensor, and so report no air quality
 * readings. */
export const ENVIRONMENTAL_CARE_TYPES_WITHOUT_AIR_QUALITY_SENSOR: readonly string[] =
  ["739", "960"];

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
 * carbon dioxide. Every other pollutant field is an index, in tenths. */
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

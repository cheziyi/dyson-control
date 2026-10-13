// A machine's controllable state, each field under Dyson's own name for it.
// `../protocol/state.ts` maps it to and from the machine's fields.

export const FAN_SPEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** There is no speed of 0: a machine sent one takes it for no speed. */
export type FanSpeed = (typeof FAN_SPEEDS)[number];

export const OSCILLATION_MODES = [
  "off",
  "on",
  "idleOff",
  "idleOn",
  "scan",
] as const;

/** `on` and `off` are the two known to be written. What a machine means by
 * the other three is not known: see UNSUPPORTED.md. */
export type OscillationMode = (typeof OSCILLATION_MODES)[number];

export const FAN_AIR_DIRECTIONS = ["forward", "backward"] as const;

/** Where the machine blows its air out. */
export type FanAirDirection = (typeof FAN_AIR_DIRECTIONS)[number];

export const HEAT_MODES = ["off", "heat"] as const;

export type HeatMode = (typeof HEAT_MODES)[number];

export const HUMIDIFICATION_MODES = ["off", "humidify"] as const;

export type HumidificationMode = (typeof HUMIDIFICATION_MODES)[number];

/** The two ends a machine oscillates between, each in degrees. */
export interface OscillationAngles {
  lowerInDegrees: number;
  upperInDegrees: number;
}

/** Every field but `fanPower` is `null` where the machine reports none, or
 * a value outside the field's type: a fan without a heater reports no
 * `heatMode`. */
export interface EnvironmentalCareState {
  fanPower: boolean;
  /** Whether the machine picks the fan speed itself. */
  autoMode: boolean | null;
  /** `null` also while the machine reports `AUTO` for it, as it does in
   * auto mode. */
  fanSpeed: FanSpeed | null;
  oscillationMode: OscillationMode | null;
  oscillationAngles: OscillationAngles | null;
  nightMode: boolean | null;
  /** Whether the machine keeps measuring the air while it is off. */
  continuousMonitoring: boolean | null;
  /** The minutes left until the machine switches itself off, or `off`. */
  sleepTimerInMinutes: number | "off" | null;
  fanAirDirection: FanAirDirection | null;
  heatMode: HeatMode | null;
  /** The temperature `heatMode` holds the room at. */
  targetTemperatureInC: number | null;
  humidificationMode: HumidificationMode | null;
  /** Whether the machine picks the target humidity itself. */
  autoHumidification: boolean | null;
  manualHumidificationTargetInPercent: number | null;
}

/** A partial `EnvironmentalCareState`, as
 * `EnvironmentalCareDysonClient.setState` takes it: set only the fields to
 * change. The client sends each field as given, whether or not the machine
 * has the feature. */
export type EnvironmentalCareControl = {
  [Field in keyof EnvironmentalCareState]?: NonNullable<
    EnvironmentalCareState[Field]
  >;
};

/** A reading is `null` when the machine does not report it.
 *
 * An index is the machine's own measure of how clean the air is, the same
 * for every pollutant: under 4 is good, under 7 fair, under 9 poor, under 11
 * very poor, under 13 extremely poor, and severe from there to 15. */
export interface EnvironmentalCareSensors {
  temperatureInC: number | null;
  humidityInPercent: number | null;
  pm25InMicrogramsPerCubicMetre: number | null;
  pm25Index: number | null;
  pm10InMicrogramsPerCubicMetre: number | null;
  pm10Index: number | null;
  volatileOrganicCompoundsIndex: number | null;
  nitrogenDioxideIndex: number | null;
  formaldehydeInMicrogramsPerCubicMetre: number | null;
  formaldehydeIndex: number | null;
  carbonDioxideInPpm: number | null;
  carbonDioxideIndex: number | null;
}

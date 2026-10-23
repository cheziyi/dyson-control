// What a machine carries. `../protocol/capabilities.ts` decodes it from the
// machine's type, variant and firmware capabilities.

import type {
  AirQualityTarget,
  FanAirDirection,
  FindAndFollowMode,
  FocusDiffuse,
  HeatMode,
  HumidificationMode,
  NozzleAngle,
  OscillationAngles,
  OscillationMode,
  OscillationPresetAngle,
  TemperatureUnit,
  TiltAngle,
  WaterHardness,
  WickDryingSpeed,
} from "./state.js";

/** How a machine oscillates, by Dyson's name for each: `basic` on and off,
 * `advanced` between two angles as well, `barrel` to a preset angle or a
 * breeze, and `tilt` on its axis. */
export type OscillationKind = "none" | "basic" | "advanced" | "barrel" | "tilt";

export const FILTERS = ["filter", "innerFilter", "outerFilter"] as const;

/** A filter whose life a machine reports and has reset: a machine of the
 * first generation has one `filter`, and a later one an `innerFilter` and
 * an `outerFilter`. */
export type Filter = (typeof FILTERS)[number];

/** The lowest and the highest `targetTemperatureInC` a heater takes. */
export interface TargetTemperatureRange {
  minInC: number;
  maxInC: number;
}

/** Each field but `targetTemperatureRange`, `oscillation`,
 * `oscillationAngleWidthsInDegrees`, `hasAirQualitySensor`,
 * `hasTemperatureSensor` and `filters` is named for the
 * `EnvironmentalCareState` field it governs, and says whether `setState`
 * takes that field or which values it takes. An empty list is a field the
 * machine does not take, and `setState` rejects a field the machine does
 * not take. */
export interface EnvironmentalCareCapabilities {
  autoMode: boolean;
  continuousMonitoring: boolean;
  /** Also governs `targetTemperatureInC`, which `targetTemperatureRange`
   * bounds. */
  heatModes: HeatMode[];
  /** The `targetTemperatureInC` the machine takes, or `null` for one
   * without a heater. */
  targetTemperatureRange: TargetTemperatureRange | null;
  fanAirDirections: FanAirDirection[];
  /** Also governs `manualHumidificationTargetInPercent`. */
  humidificationModes: HumidificationMode[];
  autoHumidification: boolean;
  /** A `tilt` takes `tiltAnglesInDegrees` in place of the fields of every
   * other oscillation. */
  oscillation: OscillationKind;
  /** `off` and `on` for a `basic` oscillation, and `idleOff` and `idleOn`
   * as well for an `advanced` or a `barrel` one, whose `on` and `idleOn`
   * `setState` takes only with `oscillationAngles` or an
   * `oscillationPresetAngleInDegrees`: see UNSUPPORTED.md. */
  oscillationModes: OscillationMode[];
  /** The widest `oscillationAngles` the machine takes: it takes two angles
   * between these, the lower first, apart by one of
   * `oscillationAngleWidthsInDegrees`. `null` for a machine that takes
   * none: an `advanced` oscillation whose firmware takes none takes
   * `oscillationPresetAnglesInDegrees` instead. */
  oscillationAngles: OscillationAngles | null;
  /** The upper angle less the lower that `oscillationAngles` takes. `0`
   * points the machine one way without oscillating. */
  oscillationAngleWidthsInDegrees: number[];
  oscillationPresetAnglesInDegrees: OscillationPresetAngle[];
  tiltAnglesInDegrees: TiltAngle[];
  findAndFollowModes: FindAndFollowMode[];
  /** Taken by a machine that runs a clean cycle. */
  waterHardnesses: WaterHardness[];
  childLockMode: boolean;
  temperatureUnits: TemperatureUnit[];
  nozzleAngles: NozzleAngle[];
  focusDiffuses: FocusDiffuse[];
  airQualityTargets: AirQualityTarget[];
  wickDryingMode: boolean;
  wickDryingSpeeds: WickDryingSpeed[];
  uvMode: boolean;
  ionisationMode: boolean;
  /** Whether the machine measures the air, and so reports the pollutant
   * readings of `EnvironmentalCareSensors`. */
  hasAirQualitySensor: boolean;
  /** Whether the machine reports `EnvironmentalCareSensors.temperatureInC`. */
  hasTemperatureSensor: boolean;
  /** The filters whose life the machine reports, which
   * `EnvironmentalCareClient.resetFilterLife` takes. */
  filters: Filter[];
}

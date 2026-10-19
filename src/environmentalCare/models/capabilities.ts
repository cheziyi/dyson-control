// What a machine carries. `../protocol/capabilities.ts` decodes it from the
// machine's type, variant and firmware capabilities.

import type {
  FanAirDirection,
  HeatMode,
  HumidificationMode,
  OscillationAngles,
  OscillationPresetAngle,
} from "./state.js";

/** How a machine oscillates, by Dyson's name for each: `basic` on and off,
 * `advanced` between two angles as well, `barrel` to a preset angle or a
 * breeze, and `tilt` on its axis. */
export type OscillationKind = "none" | "basic" | "advanced" | "barrel" | "tilt";

/** Each field but `oscillation` and `hasAirQualitySensor` is named for the
 * `EnvironmentalCareState` field it governs, and says whether `setState`
 * takes that field or which values it takes. An empty list is a field the
 * machine does not take, and `setState` rejects a field the machine does
 * not take. */
export interface EnvironmentalCareCapabilities {
  autoMode: boolean;
  continuousMonitoring: boolean;
  /** Also governs `targetTemperatureInC`. */
  heatModes: HeatMode[];
  fanAirDirections: FanAirDirection[];
  /** Also governs `manualHumidificationTargetInPercent`. */
  humidificationModes: HumidificationMode[];
  autoHumidification: boolean;
  /** `setState` writes `oscillationMode` to every oscillation but `tilt`,
   * which it writes nothing to. */
  oscillation: OscillationKind;
  /** The widest `oscillationAngles` the machine takes: it takes any two
   * angles between these, the lower first. `null` for a machine that takes
   * none: an `advanced` oscillation whose firmware takes none takes
   * `oscillationPresetAnglesInDegrees` instead. */
  oscillationAngles: OscillationAngles | null;
  oscillationPresetAnglesInDegrees: OscillationPresetAngle[];
  /** Whether the machine measures the air, and so reports the pollutant
   * readings of `EnvironmentalCareSensors`. */
  hasAirQualitySensor: boolean;
}

// What a machine carries. `../protocol/capabilities.ts` decodes it from the
// machine's type, variant and firmware capabilities.

import type { FanAirDirection, HeatMode, HumidificationMode } from "./state.js";

/** How a machine oscillates, by Dyson's name for each: `basic` on and off,
 * `advanced` between two angles as well, `barrel` to a preset angle or a
 * breeze, and `tilt` on its axis. */
export type OscillationKind = "none" | "basic" | "advanced" | "barrel" | "tilt";

/** Each field but `oscillation` and `hasAirQualitySensor` is named for the
 * `EnvironmentalCareState` field it governs, and says whether `setState`
 * takes that field or which values it takes. An empty list is a field the
 * machine does not take. */
export interface EnvironmentalCareCapabilities {
  autoMode: boolean;
  continuousMonitoring: boolean;
  /** Also governs `targetTemperatureInC`. */
  heatModes: HeatMode[];
  fanAirDirections: FanAirDirection[];
  /** Also governs `manualHumidificationTargetInPercent`. */
  humidificationModes: HumidificationMode[];
  autoHumidification: boolean;
  /** `setState` writes `oscillationMode` to a `basic`, `advanced` or
   * `barrel` oscillation, and nothing else of a `barrel` or a `tilt` one. */
  oscillation: OscillationKind;
  /** Whether the machine takes any two angles. An `advanced` oscillation
   * whose firmware does not takes a preset angle alone, which `setState`
   * does not write. */
  oscillationAngles: boolean;
  /** Whether the machine measures the air, and so reports the pollutant
   * readings of `EnvironmentalCareSensors`. */
  hasAirQualitySensor: boolean;
}

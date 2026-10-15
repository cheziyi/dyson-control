// The controls a machine carries. `../protocol/capabilities.ts` reads them
// from a machine's type, variant and capabilities.

import type { FanAirDirection, HeatMode, HumidificationMode } from "./state.js";

/** How a machine oscillates: `basic` turns on and off, `advanced` sweeps
 * between settable angles, `barrel` turns to a preset angle or breezes, and
 * `tilt` tilts the machine on its axis. */
export type OscillationKind = "none" | "basic" | "advanced" | "barrel" | "tilt";

/** The controls a machine carries, each as what its control takes: the
 * modes or directions it can be set to, whether it can be switched on. An
 * empty list, or a `"none"` oscillation, is a control the machine does not
 * carry, and `setState` takes no field for. */
export interface EnvironmentalCareCapabilities {
  /** Whether the machine picks the fan speed itself. */
  autoMode: boolean;
  /** Whether the machine keeps measuring the air while it is off. */
  continuousMonitoring: boolean;
  /** The modes the machine's heat control takes, `off` and `heat`. An empty
   * list is a machine that does not heat. */
  heatModes: HeatMode[];
  /** The directions the machine can blow its air, `forward` and `backward`.
   * An empty list is a machine that carries no air direction. */
  fanAirDirections: FanAirDirection[];
  /** The modes the machine's humidification control takes, `off` and
   * `humidify`. An empty list is a machine that does not humidify. */
  humidificationModes: HumidificationMode[];
  /** Whether the machine picks the humidification target itself. */
  autoHumidification: boolean;
  oscillation: OscillationKind;
  /** Whether the machine measures the air, and so reports air quality
   * readings. */
  airQualitySensor: boolean;
}

import type { DysonMachine } from "../../cloud/models/machine.js";
import type {
  EnvironmentalCareCapabilities,
  OscillationKind,
} from "../models/capabilities.js";
import {
  FAN_AIR_DIRECTIONS,
  HEAT_MODES,
  HUMIDIFICATION_MODES,
} from "../models/state.js";
import {
  ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_CAPABILITIES,
  ENVIRONMENTAL_CARE_AUTO_HUMIDIFICATION_TYPES,
  ENVIRONMENTAL_CARE_BARREL_OSCILLATION_TYPES,
  ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_EXCLUDED_VARIANTS,
  ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_TYPES,
  ENVIRONMENTAL_CARE_HEAT_TYPES,
  ENVIRONMENTAL_CARE_HUMIDIFICATION_TYPES,
  ENVIRONMENTAL_CARE_TILT_OSCILLATION_TYPES,
  ENVIRONMENTAL_CARE_TYPES_WITHOUT_ADVANCED_OSCILLATION,
  ENVIRONMENTAL_CARE_TYPES_WITHOUT_AIR_QUALITY_SENSOR,
  ENVIRONMENTAL_CARE_TYPES_WITHOUT_BASIC_OSCILLATION,
  ENVIRONMENTAL_CARE_TYPES_WITHOUT_CONTINUOUS_MONITORING,
} from "./tables.js";
import { decodeEnvironmentalCareType } from "./type.js";

/** The controls a machine carries, from its type, variant and the
 * capabilities of the cloud's manifest. It resolves with `undefined` for a
 * machine whose type is no known environmental care machine's. */
export function parseEnvironmentalCareCapabilities(
  machine: DysonMachine,
): EnvironmentalCareCapabilities | undefined {
  const type = decodeEnvironmentalCareType(machine.type);
  if (type === undefined) {
    return undefined;
  }
  const capabilities = machine.capabilities ?? [];
  const advancedOscillationCapability =
    ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_CAPABILITIES.some((each) =>
      capabilities.includes(each),
    );
  let oscillation: OscillationKind;
  if (type.generation1) {
    oscillation = "basic";
  } else if (
    ENVIRONMENTAL_CARE_BARREL_OSCILLATION_TYPES.includes(machine.type)
  ) {
    oscillation = "barrel";
  } else if (ENVIRONMENTAL_CARE_TILT_OSCILLATION_TYPES.includes(machine.type)) {
    oscillation = "tilt";
  } else if (
    advancedOscillationCapability &&
    !ENVIRONMENTAL_CARE_TYPES_WITHOUT_ADVANCED_OSCILLATION.includes(
      machine.type,
    )
  ) {
    oscillation = "advanced";
  } else if (
    !advancedOscillationCapability &&
    !ENVIRONMENTAL_CARE_TYPES_WITHOUT_BASIC_OSCILLATION.includes(machine.type)
  ) {
    oscillation = "basic";
  } else {
    oscillation = "none";
  }
  return {
    autoMode: type.hasAutoMode,
    continuousMonitoring:
      !ENVIRONMENTAL_CARE_TYPES_WITHOUT_CONTINUOUS_MONITORING.includes(
        machine.type,
      ),
    heatModes: ENVIRONMENTAL_CARE_HEAT_TYPES.includes(machine.type)
      ? [...HEAT_MODES]
      : [],
    fanAirDirections:
      ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_TYPES.includes(machine.type) &&
      !ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_EXCLUDED_VARIANTS.includes(
        machineVariant(machine),
      )
        ? [...FAN_AIR_DIRECTIONS]
        : [],
    humidificationModes: ENVIRONMENTAL_CARE_HUMIDIFICATION_TYPES.includes(
      machine.type,
    )
      ? [...HUMIDIFICATION_MODES]
      : [],
    autoHumidification: ENVIRONMENTAL_CARE_AUTO_HUMIDIFICATION_TYPES.includes(
      machine.type,
    ),
    oscillation,
    airQualitySensor:
      !ENVIRONMENTAL_CARE_TYPES_WITHOUT_AIR_QUALITY_SENSOR.includes(
        machine.type,
      ),
  };
}

/** A machine's variant, as its type and variant joined: a `438` of variant
 * `M` is a `438M`. */
function machineVariant(machine: DysonMachine): string {
  return machine.type + (machine.variant ?? "");
}

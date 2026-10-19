import type { DysonMachine } from "../../cloud/models/machine.js";
import type {
  EnvironmentalCareCapabilities,
  Filter,
  OscillationKind,
} from "../models/capabilities.js";
import {
  AIR_QUALITY_TARGETS,
  FAN_AIR_DIRECTIONS,
  FIND_AND_FOLLOW_MODES,
  FOCUS_DIFFUSES,
  HEAT_MODES,
  HUMIDIFICATION_MODES,
  NOZZLE_ANGLES,
  type OscillationAngles,
  type OscillationMode,
  type OscillationPresetAngle,
  TEMPERATURE_UNITS,
  TILT_ANGLES,
  WATER_HARDNESSES,
  WICK_DRYING_SPEEDS,
} from "../models/state.js";
import {
  ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_ANGLE_WIDTHS,
  ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_PRESET_ANGLES,
  ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_RANGE,
  ENVIRONMENTAL_CARE_BARREL_OSCILLATION_PRESET_ANGLES,
  ENVIRONMENTAL_CARE_FIRMWARE_CAPABILITIES,
  ENVIRONMENTAL_CARE_NARROW_OSCILLATION_ANGLE_WIDTHS,
  ENVIRONMENTAL_CARE_NARROW_OSCILLATION_PRESET_ANGLES,
  ENVIRONMENTAL_CARE_NARROW_OSCILLATION_RANGE,
  ENVIRONMENTAL_CARE_TYPE_MODELS_WITH_UV_AND_IONISATION,
  ENVIRONMENTAL_CARE_TYPES_WITH_AUTO_HUMIDIFICATION,
  ENVIRONMENTAL_CARE_TYPES_WITH_BARREL_OSCILLATION,
  ENVIRONMENTAL_CARE_TYPES_WITH_CHILD_LOCK,
  ENVIRONMENTAL_CARE_TYPES_WITH_CLEAN_CYCLE,
  ENVIRONMENTAL_CARE_TYPES_WITH_FAN_AIR_DIRECTION,
  ENVIRONMENTAL_CARE_TYPES_WITH_FIND_AND_FOLLOW,
  ENVIRONMENTAL_CARE_TYPES_WITH_FOCUS_DIFFUSE,
  ENVIRONMENTAL_CARE_TYPES_WITH_HEAT_MODE,
  ENVIRONMENTAL_CARE_TYPES_WITH_HUMIDIFICATION_MODE,
  ENVIRONMENTAL_CARE_TYPES_WITH_NARROW_OSCILLATION,
  ENVIRONMENTAL_CARE_TYPES_WITH_NOZZLE_ANGLE,
  ENVIRONMENTAL_CARE_TYPES_WITH_TILT_OSCILLATION,
  ENVIRONMENTAL_CARE_TYPES_WITH_UV,
  ENVIRONMENTAL_CARE_TYPES_WITH_WICK_DRYING,
  ENVIRONMENTAL_CARE_TYPES_WITHOUT_ADVANCED_OSCILLATION,
  ENVIRONMENTAL_CARE_TYPES_WITHOUT_AIR_QUALITY_SENSOR,
  ENVIRONMENTAL_CARE_TYPES_WITHOUT_AUTO_MODE,
  ENVIRONMENTAL_CARE_TYPES_WITHOUT_BASIC_OSCILLATION,
  ENVIRONMENTAL_CARE_TYPES_WITHOUT_CONTINUOUS_MONITORING,
  ENVIRONMENTAL_CARE_TYPES_WITHOUT_FILTER_LIFE,
  ENVIRONMENTAL_CARE_TYPES_WITHOUT_TEMPERATURE_UNIT,
  ENVIRONMENTAL_CARE_VARIANTS_WITH_FIND_AND_FOLLOW,
  ENVIRONMENTAL_CARE_VARIANTS_WITHOUT_FAN_AIR_DIRECTION,
  ENVIRONMENTAL_CARE_VARIANTS_WITHOUT_TEMPERATURE_UNIT,
} from "./tables.js";
import type { EnvironmentalCareType } from "./type.js";

export function decodeEnvironmentalCareCapabilities(
  machine: DysonMachine,
  type: EnvironmentalCareType,
): EnvironmentalCareCapabilities {
  const firmwareCapabilities = machine.firmwareCapabilities ?? [];
  const oscillation = decodeOscillation(
    machine.type,
    type,
    firmwareCapabilities,
  );
  const narrow = ENVIRONMENTAL_CARE_TYPES_WITH_NARROW_OSCILLATION.includes(
    machine.type,
  );
  const typeAndVariant = machine.type + (machine.variant ?? "");
  const uvAndIonisation =
    machine.model !== undefined &&
    ENVIRONMENTAL_CARE_TYPE_MODELS_WITH_UV_AND_IONISATION.includes(
      `${machine.type}/${machine.model}`,
    );
  const oscillationAngles =
    oscillation === "advanced" &&
    firmwareCapabilities.includes(
      ENVIRONMENTAL_CARE_FIRMWARE_CAPABILITIES.advanceOscillationDay1,
    )
      ? decodeOscillationRange(narrow)
      : null;
  return {
    autoMode:
      type.generation1 ||
      !ENVIRONMENTAL_CARE_TYPES_WITHOUT_AUTO_MODE.includes(machine.type),
    continuousMonitoring:
      !ENVIRONMENTAL_CARE_TYPES_WITHOUT_CONTINUOUS_MONITORING.includes(
        machine.type,
      ),
    heatModes: ENVIRONMENTAL_CARE_TYPES_WITH_HEAT_MODE.includes(machine.type)
      ? [...HEAT_MODES]
      : [],
    fanAirDirections:
      ENVIRONMENTAL_CARE_TYPES_WITH_FAN_AIR_DIRECTION.includes(machine.type) &&
      !ENVIRONMENTAL_CARE_VARIANTS_WITHOUT_FAN_AIR_DIRECTION.includes(
        typeAndVariant,
      )
        ? [...FAN_AIR_DIRECTIONS]
        : [],
    humidificationModes:
      ENVIRONMENTAL_CARE_TYPES_WITH_HUMIDIFICATION_MODE.includes(machine.type)
        ? [...HUMIDIFICATION_MODES]
        : [],
    autoHumidification:
      ENVIRONMENTAL_CARE_TYPES_WITH_AUTO_HUMIDIFICATION.includes(machine.type),
    oscillation,
    oscillationModes: decodeOscillationModes(oscillation),
    oscillationAngles,
    oscillationAngleWidthsInDegrees:
      oscillationAngles === null
        ? []
        : [
            ...(narrow
              ? ENVIRONMENTAL_CARE_NARROW_OSCILLATION_ANGLE_WIDTHS
              : ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_ANGLE_WIDTHS),
          ],
    oscillationPresetAnglesInDegrees: [
      ...decodeOscillationPresetAngles(
        oscillation,
        oscillationAngles !== null,
        narrow,
      ),
    ],
    tiltAnglesInDegrees: oscillation === "tilt" ? [...TILT_ANGLES] : [],
    findAndFollowModes:
      ENVIRONMENTAL_CARE_VARIANTS_WITH_FIND_AND_FOLLOW.includes(
        typeAndVariant,
      ) || ENVIRONMENTAL_CARE_TYPES_WITH_FIND_AND_FOLLOW.includes(machine.type)
        ? [...FIND_AND_FOLLOW_MODES]
        : [],
    waterHardnesses: ENVIRONMENTAL_CARE_TYPES_WITH_CLEAN_CYCLE.includes(
      machine.type,
    )
      ? [...WATER_HARDNESSES]
      : [],
    childLockMode: ENVIRONMENTAL_CARE_TYPES_WITH_CHILD_LOCK.includes(
      machine.type,
    ),
    temperatureUnits:
      type.generation1 ||
      ENVIRONMENTAL_CARE_TYPES_WITHOUT_TEMPERATURE_UNIT.includes(
        machine.type,
      ) ||
      ENVIRONMENTAL_CARE_VARIANTS_WITHOUT_TEMPERATURE_UNIT.includes(
        typeAndVariant,
      )
        ? []
        : [...TEMPERATURE_UNITS],
    nozzleAngles: ENVIRONMENTAL_CARE_TYPES_WITH_NOZZLE_ANGLE.includes(
      machine.type,
    )
      ? [...NOZZLE_ANGLES]
      : [],
    focusDiffuses: ENVIRONMENTAL_CARE_TYPES_WITH_FOCUS_DIFFUSE.includes(
      machine.type,
    )
      ? [...FOCUS_DIFFUSES]
      : [],
    airQualityTargets: type.generation1 ? [...AIR_QUALITY_TARGETS] : [],
    wickDryingMode: ENVIRONMENTAL_CARE_TYPES_WITH_WICK_DRYING.includes(
      machine.type,
    ),
    wickDryingSpeeds: ENVIRONMENTAL_CARE_TYPES_WITH_WICK_DRYING.includes(
      machine.type,
    )
      ? [...WICK_DRYING_SPEEDS]
      : [],
    uvMode:
      uvAndIonisation ||
      ENVIRONMENTAL_CARE_TYPES_WITH_UV.includes(machine.type),
    ionisationMode: uvAndIonisation,
    hasAirQualitySensor:
      !ENVIRONMENTAL_CARE_TYPES_WITHOUT_AIR_QUALITY_SENSOR.includes(
        machine.type,
      ),
    filters: decodeFilters(machine.type, type),
  };
}

// A basic oscillation goes on and off alone, and pauses with no idle mode.
function decodeOscillationModes(
  oscillation: OscillationKind,
): OscillationMode[] {
  if (oscillation === "basic") {
    return ["off", "on"];
  }
  return oscillation === "advanced" || oscillation === "barrel"
    ? ["off", "on", "idleOff", "idleOn"]
    : [];
}

function decodeFilters(
  machineType: string,
  type: EnvironmentalCareType,
): Filter[] {
  if (type.generation1) {
    return ["filter"];
  }
  return ENVIRONMENTAL_CARE_TYPES_WITHOUT_FILTER_LIFE.includes(machineType)
    ? []
    : ["innerFilter", "outerFilter"];
}

// A later type whose firmware gives it angles oscillates on and off through
// them alone, so one that takes no angles then does not oscillate.
function decodeOscillation(
  machineType: string,
  type: EnvironmentalCareType,
  firmwareCapabilities: string[],
): OscillationKind {
  if (type.generation1) {
    return "basic";
  }
  if (ENVIRONMENTAL_CARE_TYPES_WITH_BARREL_OSCILLATION.includes(machineType)) {
    return "barrel";
  }
  if (ENVIRONMENTAL_CARE_TYPES_WITH_TILT_OSCILLATION.includes(machineType)) {
    return "tilt";
  }
  const firmwareGivesAngles = Object.values(
    ENVIRONMENTAL_CARE_FIRMWARE_CAPABILITIES,
  ).some((each) => firmwareCapabilities.includes(each));
  if (firmwareGivesAngles) {
    return ENVIRONMENTAL_CARE_TYPES_WITHOUT_ADVANCED_OSCILLATION.includes(
      machineType,
    )
      ? "none"
      : "advanced";
  }
  return ENVIRONMENTAL_CARE_TYPES_WITHOUT_BASIC_OSCILLATION.includes(
    machineType,
  )
    ? "none"
    : "basic";
}

function decodeOscillationRange(narrow: boolean): OscillationAngles {
  return {
    ...(narrow
      ? ENVIRONMENTAL_CARE_NARROW_OSCILLATION_RANGE
      : ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_RANGE),
  };
}

// A machine that takes oscillation angles takes a preset as two of them.
function decodeOscillationPresetAngles(
  oscillation: OscillationKind,
  takesOscillationAngles: boolean,
  narrow: boolean,
): readonly OscillationPresetAngle[] {
  if (oscillation === "barrel") {
    return ENVIRONMENTAL_CARE_BARREL_OSCILLATION_PRESET_ANGLES;
  }
  if (oscillation !== "advanced" || takesOscillationAngles) {
    return [];
  }
  return narrow
    ? ENVIRONMENTAL_CARE_NARROW_OSCILLATION_PRESET_ANGLES
    : ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_PRESET_ANGLES;
}

import type {
  EnvironmentalCareCapabilities,
  Filter,
} from "../models/capabilities.js";
import {
  AIR_QUALITY_TARGETS,
  type AirQualityTarget,
  type EnvironmentalCareControl,
  type EnvironmentalCareSensors,
  type EnvironmentalCareState,
  FAN_SPEEDS,
  type FanSpeed,
  OSCILLATION_PRESET_ANGLES,
  type OscillationPresetAngle,
  TILT_ANGLES,
  type TiltAngle,
  WATER_HARDNESSES,
  type WaterHardness,
} from "../models/state.js";
import {
  ENVIRONMENTAL_CARE_AIR_QUALITY_TARGET_CODES,
  ENVIRONMENTAL_CARE_BACKWARD_TILT_ANGLE,
  ENVIRONMENTAL_CARE_CLEAN_CYCLE_STATE_CODES,
  ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_CODES,
  ENVIRONMENTAL_CARE_FAN_MODE_CODES,
  ENVIRONMENTAL_CARE_FIELDS,
  ENVIRONMENTAL_CARE_FILTER_LIFE_IN_HOURS,
  ENVIRONMENTAL_CARE_FIND_AND_FOLLOW_MODE_CODES,
  ENVIRONMENTAL_CARE_FOCUS_DIFFUSE_CODES,
  ENVIRONMENTAL_CARE_HEAT_MODE_CODES,
  ENVIRONMENTAL_CARE_HUMIDIFICATION_MODE_CODES,
  ENVIRONMENTAL_CARE_INNER_FILTER_TYPE_CODES,
  ENVIRONMENTAL_CARE_KELVIN_OFFSETS,
  ENVIRONMENTAL_CARE_NOZZLE_ANGLE_CODES,
  ENVIRONMENTAL_CARE_OSCILLATION_MODE_CODES,
  ENVIRONMENTAL_CARE_OSCILLATION_PRESET_ANGLE_CODES,
  ENVIRONMENTAL_CARE_OSCILLATION_STATE_CODES,
  ENVIRONMENTAL_CARE_OUTER_FILTER_TYPE_CODES,
  ENVIRONMENTAL_CARE_RESET_FILTER_LIFE_CODE,
  ENVIRONMENTAL_CARE_RESET_FILTER_LIFE_FIELDS,
  ENVIRONMENTAL_CARE_SENSOR_FIELDS,
  ENVIRONMENTAL_CARE_SWITCH_CODES,
  ENVIRONMENTAL_CARE_TEMPERATURE_UNIT_CODES,
  ENVIRONMENTAL_CARE_TILT_ANGLE_CODES,
  ENVIRONMENTAL_CARE_TILT_TYPE_CODES,
  ENVIRONMENTAL_CARE_WATER_HARDNESS_INTERVALS_IN_HOURS,
  ENVIRONMENTAL_CARE_WICK_DRYING_SPEED_CODES,
  ENVIRONMENTAL_CARE_WICK_DRYING_STATE_CODES,
} from "./tables.js";
import type { EnvironmentalCareType } from "./type.js";

export function parseEnvironmentalCareState(
  values: Record<string, string>,
  type: EnvironmentalCareType,
): EnvironmentalCareState {
  const fanMode = values[ENVIRONMENTAL_CARE_FIELDS.fanMode];
  const lowerInDegrees = decodeNumber(
    values[ENVIRONMENTAL_CARE_FIELDS.oscillationAngleLowerBoundary],
  );
  const upperInDegrees = decodeNumber(
    values[ENVIRONMENTAL_CARE_FIELDS.oscillationAngleUpperBoundary],
  );
  return {
    ...(type.generation1
      ? {
          fanPower: fanMode !== ENVIRONMENTAL_CARE_FAN_MODE_CODES.off,
          autoMode:
            fanMode === undefined
              ? null
              : fanMode === ENVIRONMENTAL_CARE_FAN_MODE_CODES.auto,
        }
      : {
          fanPower:
            values[ENVIRONMENTAL_CARE_FIELDS.fanPower] ===
            ENVIRONMENTAL_CARE_SWITCH_CODES.on,
          autoMode: decodeSwitch(values[ENVIRONMENTAL_CARE_FIELDS.autoMode]),
        }),
    fanSpeed: decodeFanSpeed(values[ENVIRONMENTAL_CARE_FIELDS.fanSpeed]),
    oscillationMode: decodeCode(
      ENVIRONMENTAL_CARE_OSCILLATION_MODE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.oscillationMode],
    ),
    oscillationAngles:
      lowerInDegrees === null || upperInDegrees === null
        ? null
        : { lowerInDegrees, upperInDegrees },
    oscillationPresetAngleInDegrees:
      OSCILLATION_PRESET_ANGLES.find(
        (each) =>
          encodeOscillationPresetAngle(each) ===
          values[ENVIRONMENTAL_CARE_FIELDS.oscillationAngle],
      ) ?? null,
    nightMode: decodeSwitch(values[ENVIRONMENTAL_CARE_FIELDS.nightMode]),
    continuousMonitoring: decodeSwitch(
      values[ENVIRONMENTAL_CARE_FIELDS.continuousMonitoring],
    ),
    sleepTimerInMinutes: decodeSleepTimer(
      values[ENVIRONMENTAL_CARE_FIELDS.sleepTimer],
    ),
    fanAirDirection: decodeCode(
      ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.fanAirDirection],
    ),
    heatMode: decodeCode(
      ENVIRONMENTAL_CARE_HEAT_MODE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.heatMode],
    ),
    targetTemperatureInC: decodeTemperature(
      values[ENVIRONMENTAL_CARE_FIELDS.targetTemperature],
      type,
    ),
    humidificationMode: decodeCode(
      ENVIRONMENTAL_CARE_HUMIDIFICATION_MODE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.humidificationMode],
    ),
    autoHumidification: decodeSwitch(
      values[ENVIRONMENTAL_CARE_FIELDS.autoHumidification],
    ),
    manualHumidificationTargetInPercent: decodeNumber(
      values[ENVIRONMENTAL_CARE_FIELDS.manualHumidificationTarget],
    ),
    tiltAngleInDegrees: decodeTiltAngle(values),
    findAndFollowMode: decodeCode(
      ENVIRONMENTAL_CARE_FIND_AND_FOLLOW_MODE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.findAndFollowMode],
    ),
    waterHardness: decodeWaterHardness(
      values[ENVIRONMENTAL_CARE_FIELDS.intervalBetweenCleanCycles],
    ),
    childLockMode: decodeSwitch(
      values[ENVIRONMENTAL_CARE_FIELDS.childLockMode],
    ),
    temperatureUnit: decodeCode(
      ENVIRONMENTAL_CARE_TEMPERATURE_UNIT_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.temperatureUnit],
    ),
    nozzleAngle: decodeCode(
      ENVIRONMENTAL_CARE_NOZZLE_ANGLE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.nozzleAngle],
    ),
    focusDiffuse: decodeCode(
      ENVIRONMENTAL_CARE_FOCUS_DIFFUSE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.focusDiffuse],
    ),
    airQualityTarget: decodeAirQualityTarget(
      values[ENVIRONMENTAL_CARE_FIELDS.airQualityTarget],
    ),
    wickDryingMode: decodeSwitch(
      values[ENVIRONMENTAL_CARE_FIELDS.wickDryingMode],
    ),
    wickDryingSpeed: decodeCode(
      ENVIRONMENTAL_CARE_WICK_DRYING_SPEED_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.wickDryingSpeed],
    ),
    uvMode: decodeSwitch(values[ENVIRONMENTAL_CARE_FIELDS.uvMode]),
    ionisationMode: decodeSwitch(
      values[ENVIRONMENTAL_CARE_FIELDS.ionisationMode],
    ),
    oscillationState: decodeCode(
      ENVIRONMENTAL_CARE_OSCILLATION_STATE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.oscillationState],
    ),
    findAndFollowState: decodeCode(
      ENVIRONMENTAL_CARE_OSCILLATION_STATE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.findAndFollowState],
    ),
    cleanCycleState: decodeCode(
      ENVIRONMENTAL_CARE_CLEAN_CYCLE_STATE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.cleanCycleState],
    ),
    remainingTimeToNextCleanCycleInHours: decodeNumber(
      values[ENVIRONMENTAL_CARE_FIELDS.remainingTimeToNextCleanCycle],
    ),
    remainingTimeOfActiveCleanCycleInMinutes: decodeNumber(
      values[ENVIRONMENTAL_CARE_FIELDS.remainingTimeOfActiveCleanCycle],
    ),
    filterLifeInHours: decodeNumberUpTo(
      values[ENVIRONMENTAL_CARE_FIELDS.filterLife],
      ENVIRONMENTAL_CARE_FILTER_LIFE_IN_HOURS,
    ),
    innerFilterLifeInPercent: decodeNumberUpTo(
      values[ENVIRONMENTAL_CARE_FIELDS.innerFilterLife],
      100,
    ),
    outerFilterLifeInPercent: decodeNumberUpTo(
      values[ENVIRONMENTAL_CARE_FIELDS.outerFilterLife],
      100,
    ),
    innerFilterType: decodeCode(
      ENVIRONMENTAL_CARE_INNER_FILTER_TYPE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.innerFilterType],
    ),
    outerFilterType: decodeCode(
      ENVIRONMENTAL_CARE_OUTER_FILTER_TYPE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.outerFilterType],
    ),
    heatState: decodeCode(
      ENVIRONMENTAL_CARE_HEAT_MODE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.heatState],
    ),
    humidificationState: decodeCode(
      ENVIRONMENTAL_CARE_HUMIDIFICATION_MODE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.humidificationState],
    ),
    wickDryingState: decodeCode(
      ENVIRONMENTAL_CARE_WICK_DRYING_STATE_CODES,
      values[ENVIRONMENTAL_CARE_FIELDS.wickDryingState],
    ),
    wickDryingTimeRemainingInMinutes: decodeNumber(
      values[ENVIRONMENTAL_CARE_FIELDS.wickDryingTimeRemaining],
    ),
  };
}

/** The fields a `STATE-SET` carries for a control: those the control sets,
 * and those the machine is written with them. Every field but those of
 * `FIELDS_WRITTEN_ALONE` also switches a later machine on, and a fan speed
 * or an auto mode a machine of the first generation. A `fanSpeed` also
 * switches the auto mode off, a `fanPower` of `false` the sleep timer, a
 * `targetTemperatureInC` the heat mode to `heat`, and an
 * `autoHumidification` or a `manualHumidificationTargetInPercent` the
 * humidification mode to `humidify`, and the latter the auto humidification
 * off. An `oscillationAngles` or an `oscillationPresetAngleInDegrees`
 * switches the oscillation on, and a `tiltAngleInDegrees` sets the fan air
 * direction. A field the control sets itself is sent as it sets it. `type`
 * says which fields the machine holds its power and its auto mode in. */
export function applyEnvironmentalCareControl(
  type: EnvironmentalCareType,
  capabilities: EnvironmentalCareCapabilities,
  control: EnvironmentalCareControl,
): Record<string, string> {
  const data: Record<string, string> = {};
  const set = (field: string, value: string | undefined) => {
    if (value !== undefined) {
      data[field] = value;
    }
  };

  const fanPower =
    control.fanPower ??
    (switchesOn(type, capabilities, control) ? true : undefined);
  const autoMode =
    control.autoMode ?? (control.fanSpeed === undefined ? undefined : false);
  if (type.generation1) {
    set(ENVIRONMENTAL_CARE_FIELDS.fanMode, encodeFanMode(fanPower, autoMode));
  } else {
    set(ENVIRONMENTAL_CARE_FIELDS.fanPower, encodeSwitch(fanPower));
    // A type without an auto mode takes a fan speed alone.
    if (capabilities.autoMode) {
      set(ENVIRONMENTAL_CARE_FIELDS.autoMode, encodeSwitch(autoMode));
    }
  }
  if (control.fanSpeed !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.fanSpeed] = encodeNumber(control.fanSpeed);
  }

  const oscillationMode =
    control.oscillationMode ??
    (control.oscillationAngles === undefined &&
    control.oscillationPresetAngleInDegrees === undefined
      ? undefined
      : "on");
  if (oscillationMode !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.oscillationMode] =
      ENVIRONMENTAL_CARE_OSCILLATION_MODE_CODES[oscillationMode];
  }
  if (control.oscillationAngles !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.oscillationAngleLowerBoundary] =
      encodeNumber(control.oscillationAngles.lowerInDegrees);
    data[ENVIRONMENTAL_CARE_FIELDS.oscillationAngleUpperBoundary] =
      encodeNumber(control.oscillationAngles.upperInDegrees);
    data[ENVIRONMENTAL_CARE_FIELDS.oscillationAngle] =
      ENVIRONMENTAL_CARE_OSCILLATION_PRESET_ANGLE_CODES.custom;
  }
  if (control.oscillationPresetAngleInDegrees !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.oscillationAngle] =
      encodeOscillationPresetAngle(control.oscillationPresetAngleInDegrees);
  }
  if (control.tiltAngleInDegrees !== undefined) {
    Object.assign(data, encodeTiltAngle(control.tiltAngleInDegrees));
  }
  if (control.findAndFollowMode !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.findAndFollowMode] =
      ENVIRONMENTAL_CARE_FIND_AND_FOLLOW_MODE_CODES[control.findAndFollowMode];
  }
  set(ENVIRONMENTAL_CARE_FIELDS.nightMode, encodeSwitch(control.nightMode));
  set(
    ENVIRONMENTAL_CARE_FIELDS.continuousMonitoring,
    encodeSwitch(control.continuousMonitoring),
  );
  // Switching the machine off stops its sleep timer.
  const sleepTimer =
    control.sleepTimerInMinutes ?? (fanPower === false ? "off" : undefined);
  if (sleepTimer !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.sleepTimer] =
      sleepTimer === "off"
        ? ENVIRONMENTAL_CARE_SWITCH_CODES.off
        : encodeNumber(sleepTimer);
  }
  if (control.fanAirDirection !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.fanAirDirection] =
      ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_CODES[control.fanAirDirection];
  }
  const heatMode =
    control.heatMode ??
    (control.targetTemperatureInC === undefined ? undefined : "heat");
  if (heatMode !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.heatMode] =
      ENVIRONMENTAL_CARE_HEAT_MODE_CODES[heatMode];
  }
  if (control.targetTemperatureInC !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.targetTemperature] = String(
      Math.round((control.targetTemperatureInC + kelvinOffset(type)) * 10),
    );
  }
  const autoHumidification =
    control.autoHumidification ??
    (control.manualHumidificationTargetInPercent !== undefined &&
    capabilities.autoHumidification
      ? false
      : undefined);
  const humidificationMode =
    control.humidificationMode ??
    (autoHumidification === undefined &&
    control.manualHumidificationTargetInPercent === undefined
      ? undefined
      : "humidify");
  if (humidificationMode !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.humidificationMode] =
      ENVIRONMENTAL_CARE_HUMIDIFICATION_MODE_CODES[humidificationMode];
  }
  set(
    ENVIRONMENTAL_CARE_FIELDS.autoHumidification,
    encodeSwitch(autoHumidification),
  );
  if (control.manualHumidificationTargetInPercent !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.manualHumidificationTarget] = encodeNumber(
      control.manualHumidificationTargetInPercent,
    );
  }
  if (control.waterHardness !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.intervalBetweenCleanCycles] = encodeNumber(
      ENVIRONMENTAL_CARE_WATER_HARDNESS_INTERVALS_IN_HOURS[
        control.waterHardness
      ],
    );
  }
  set(
    ENVIRONMENTAL_CARE_FIELDS.childLockMode,
    encodeSwitch(control.childLockMode),
  );
  if (control.temperatureUnit !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.temperatureUnit] =
      ENVIRONMENTAL_CARE_TEMPERATURE_UNIT_CODES[control.temperatureUnit];
  }
  if (control.nozzleAngle !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.nozzleAngle] =
      ENVIRONMENTAL_CARE_NOZZLE_ANGLE_CODES[control.nozzleAngle];
  }
  if (control.focusDiffuse !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.focusDiffuse] =
      ENVIRONMENTAL_CARE_FOCUS_DIFFUSE_CODES[control.focusDiffuse];
  }
  if (control.airQualityTarget !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.airQualityTarget] = encodeNumber(
      ENVIRONMENTAL_CARE_AIR_QUALITY_TARGET_CODES[control.airQualityTarget],
    );
  }
  set(
    ENVIRONMENTAL_CARE_FIELDS.wickDryingMode,
    encodeSwitch(control.wickDryingMode),
  );
  set(ENVIRONMENTAL_CARE_FIELDS.uvMode, encodeSwitch(control.uvMode));
  set(
    ENVIRONMENTAL_CARE_FIELDS.ionisationMode,
    encodeSwitch(control.ionisationMode),
  );
  if (control.wickDryingSpeed !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.wickDryingSpeed] =
      ENVIRONMENTAL_CARE_WICK_DRYING_SPEED_CODES[control.wickDryingSpeed];
  }
  return data;
}

/** The fields a later machine is written without switching it on. */
const FIELDS_WRITTEN_ALONE: readonly (keyof EnvironmentalCareControl)[] = [
  "fanPower",
  "continuousMonitoring",
  "waterHardness",
  "temperatureUnit",
  "airQualityTarget",
  "wickDryingMode",
  "wickDryingSpeed",
];

// A machine of the first generation is switched on by its fan mode, which
// takes it out of auto mode, so no other field switches it on. An advanced
// or a barrel oscillation, and find and follow, go off without it.
function switchesOn(
  type: EnvironmentalCareType,
  capabilities: EnvironmentalCareCapabilities,
  control: EnvironmentalCareControl,
): boolean {
  if (type.generation1) {
    return control.autoMode !== undefined || control.fanSpeed !== undefined;
  }
  const writtenAlone = (field: keyof EnvironmentalCareControl) =>
    FIELDS_WRITTEN_ALONE.includes(field) ||
    (field === "oscillationMode" &&
      capabilities.oscillation !== "basic" &&
      (control.oscillationMode === "off" ||
        control.oscillationMode === "idleOff")) ||
    (field === "findAndFollowMode" && control.findAndFollowMode === "off");
  return (Object.keys(control) as (keyof EnvironmentalCareControl)[]).some(
    (field) => control[field] !== undefined && !writtenAlone(field),
  );
}

/** The fields of the `STATE-SET` that resets a filter's life. */
export function buildEnvironmentalCareFilterLifeReset(
  filter: Filter,
): Record<string, string> {
  return {
    [ENVIRONMENTAL_CARE_RESET_FILTER_LIFE_FIELDS[filter]]:
      ENVIRONMENTAL_CARE_RESET_FILTER_LIFE_CODE,
  };
}

export function parseEnvironmentalCareSensors(
  values: Record<string, string>,
  type: EnvironmentalCareType,
): EnvironmentalCareSensors {
  const fields = ENVIRONMENTAL_CARE_SENSOR_FIELDS;
  return {
    temperatureInC: decodeTemperature(values[fields.temperature], type),
    humidityInPercent: decodeNumber(values[fields.humidity]),
    pm25InUgPerM3: decodeNumber(values[fields.highResolutionPm25]),
    pm25Index: decodeTenths(values[fields.pm25]),
    pm10InUgPerM3: decodeNumber(values[fields.highResolutionPm10]),
    pm10Index: decodeTenths(values[fields.pm10]),
    volatileOrganicCompoundsIndex: decodeTenths(
      values[fields.generation2VolatileOrganicCompounds],
    ),
    nitrogenDioxideIndex: decodeTenths(values[fields.nitrogenDioxide]),
    formaldehydeInUgPerM3: decodeNumber(
      values[fields.highResolutionFormaldehyde],
    ),
    formaldehydeIndex: decodeTenths(values[fields.formaldehyde]),
    carbonDioxideInPpm: decodeNumber(
      values[fields.highResolutionCarbonDioxide],
    ),
    carbonDioxideIndex: decodeTenths(values[fields.carbonDioxide]),
    sleepTimerInMinutes: decodeSleepTimer(values[fields.sleepTimer]),
  };
}

// `fanMode` is one field for the power and the auto mode: OFF, FAN or AUTO.
function encodeFanMode(
  fanPower: boolean | undefined,
  autoMode: boolean | undefined,
): string | undefined {
  if (fanPower === false) {
    return ENVIRONMENTAL_CARE_FAN_MODE_CODES.off;
  }
  if (autoMode === true) {
    return ENVIRONMENTAL_CARE_FAN_MODE_CODES.auto;
  }
  return fanPower === true || autoMode === false
    ? ENVIRONMENTAL_CARE_FAN_MODE_CODES.fan
    : undefined;
}

// A breeze tilts on and off between its angles, and a fixed angle holds the
// tilt off at one.
function encodeTiltAngle(angle: TiltAngle): Record<string, string> {
  const breeze = angle === "breeze";
  const angleCode = encodeNumber(ENVIRONMENTAL_CARE_TILT_ANGLE_CODES[angle]);
  return {
    [ENVIRONMENTAL_CARE_FIELDS.fanAirDirection]:
      ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_CODES[
        angle === ENVIRONMENTAL_CARE_BACKWARD_TILT_ANGLE
          ? "backward"
          : "forward"
      ],
    [ENVIRONMENTAL_CARE_FIELDS.tiltMode]: breeze
      ? ENVIRONMENTAL_CARE_SWITCH_CODES.on
      : ENVIRONMENTAL_CARE_SWITCH_CODES.off,
    [ENVIRONMENTAL_CARE_FIELDS.tiltType]: breeze
      ? ENVIRONMENTAL_CARE_TILT_TYPE_CODES.breeze
      : ENVIRONMENTAL_CARE_TILT_TYPE_CODES.custom,
    [ENVIRONMENTAL_CARE_FIELDS.tiltUpperAngle]: angleCode,
    [ENVIRONMENTAL_CARE_FIELDS.tiltLowerAngle]: angleCode,
  };
}

// A tilt held at an angle that blows the air backward reads as that angle,
// whatever angles it reports.
function decodeTiltAngle(values: Record<string, string>): TiltAngle | null {
  const tiltType = values[ENVIRONMENTAL_CARE_FIELDS.tiltType];
  const tiltState = values[ENVIRONMENTAL_CARE_FIELDS.tiltOscillationState];
  if (
    tiltType === ENVIRONMENTAL_CARE_TILT_TYPE_CODES.breeze &&
    tiltState === ENVIRONMENTAL_CARE_OSCILLATION_STATE_CODES.on
  ) {
    return "breeze";
  }
  if (
    tiltType !== ENVIRONMENTAL_CARE_TILT_TYPE_CODES.custom ||
    tiltState !== ENVIRONMENTAL_CARE_OSCILLATION_STATE_CODES.off
  ) {
    return null;
  }
  if (
    values[ENVIRONMENTAL_CARE_FIELDS.fanAirDirection] ===
    ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_CODES.backward
  ) {
    return ENVIRONMENTAL_CARE_BACKWARD_TILT_ANGLE;
  }
  const lower = decodeNumber(values[ENVIRONMENTAL_CARE_FIELDS.tiltLowerAngle]);
  const upper = decodeNumber(values[ENVIRONMENTAL_CARE_FIELDS.tiltUpperAngle]);
  return lower === upper
    ? (TILT_ANGLES.find(
        (each) =>
          each !== "breeze" &&
          ENVIRONMENTAL_CARE_TILT_ANGLE_CODES[each] === lower,
      ) ?? null)
    : null;
}

function decodeAirQualityTarget(
  value: string | undefined,
): AirQualityTarget | null {
  const index = decodeNumber(value);
  return (
    AIR_QUALITY_TARGETS.find(
      (each) => ENVIRONMENTAL_CARE_AIR_QUALITY_TARGET_CODES[each] === index,
    ) ?? null
  );
}

function decodeWaterHardness(value: string | undefined): WaterHardness | null {
  const hours = decodeNumber(value);
  return (
    WATER_HARDNESSES.find(
      (each) =>
        ENVIRONMENTAL_CARE_WATER_HARDNESS_INTERVALS_IN_HOURS[each] === hours,
    ) ?? null
  );
}

function encodeOscillationPresetAngle(angle: OscillationPresetAngle): string {
  return typeof angle === "number"
    ? encodeNumber(angle)
    : ENVIRONMENTAL_CARE_OSCILLATION_PRESET_ANGLE_CODES[angle];
}

function decodeFanSpeed(value: string | undefined): FanSpeed | null {
  const speed = decodeNumber(value);
  return FAN_SPEEDS.find((each) => each === speed) ?? null;
}

/** The name a table gives a code, or `null` for a code it has none for. */
function decodeCode<NameT extends string>(
  codes: Readonly<Record<NameT, string>>,
  value: string | undefined,
): NameT | null {
  const names = Object.keys(codes) as NameT[];
  return names.find((name) => codes[name] === value) ?? null;
}

function decodeSwitch(value: string | undefined): boolean | null {
  if (value === ENVIRONMENTAL_CARE_SWITCH_CODES.on) {
    return true;
  }
  return value === ENVIRONMENTAL_CARE_SWITCH_CODES.off ? false : null;
}

function encodeSwitch(value: boolean | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value
    ? ENVIRONMENTAL_CARE_SWITCH_CODES.on
    : ENVIRONMENTAL_CARE_SWITCH_CODES.off;
}

function decodeSleepTimer(value: string | undefined): number | "off" | null {
  return value === ENVIRONMENTAL_CARE_SWITCH_CODES.off
    ? "off"
    : decodeNumber(value);
}

function decodeNumber(value: string | undefined): number | null {
  return value !== undefined && /^\d+$/.test(value)
    ? Number.parseInt(value, 10)
    : null;
}

// A number above the most the field holds is no reading.
function decodeNumberUpTo(
  value: string | undefined,
  max: number,
): number | null {
  const number = decodeNumber(value);
  return number !== null && number <= max ? number : null;
}

function decodeTenths(value: string | undefined): number | null {
  const tenths = decodeNumber(value);
  return tenths === null ? null : tenths / 10;
}

// Four digits, as the machine writes its own numbers: `0005`.
function encodeNumber(value: number): string {
  return String(Math.round(value)).padStart(4, "0");
}

function decodeTemperature(
  value: string | undefined,
  type: EnvironmentalCareType,
): number | null {
  const tenthsOfKelvin = decodeNumber(value);
  return tenthsOfKelvin === null
    ? null
    : Math.round((tenthsOfKelvin / 10 - kelvinOffset(type)) * 100) / 100;
}

function kelvinOffset(type: EnvironmentalCareType): number {
  return type.generation1
    ? ENVIRONMENTAL_CARE_KELVIN_OFFSETS.generation1
    : ENVIRONMENTAL_CARE_KELVIN_OFFSETS.later;
}

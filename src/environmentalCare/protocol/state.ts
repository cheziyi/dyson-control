import {
  type EnvironmentalCareControl,
  type EnvironmentalCareSensors,
  type EnvironmentalCareState,
  FAN_SPEEDS,
  type FanSpeed,
} from "../models/state.js";
import {
  ENVIRONMENTAL_CARE_CUSTOM_OSCILLATION_PRESET_ANGLE,
  ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_CODES,
  ENVIRONMENTAL_CARE_FAN_MODE_CODES,
  ENVIRONMENTAL_CARE_FIELDS,
  ENVIRONMENTAL_CARE_HEAT_MODE_CODES,
  ENVIRONMENTAL_CARE_HUMIDIFICATION_MODE_CODES,
  ENVIRONMENTAL_CARE_KELVIN_OFFSETS,
  ENVIRONMENTAL_CARE_OSCILLATION_MODE_CODES,
  ENVIRONMENTAL_CARE_SENSOR_FIELDS,
  ENVIRONMENTAL_CARE_SWITCH_CODES,
} from "./tables.js";
import type { EnvironmentalCareType } from "./type.js";

export function parseEnvironmentalCareState(
  values: Record<string, string>,
  type: EnvironmentalCareType,
): EnvironmentalCareState {
  const fanMode = values[ENVIRONMENTAL_CARE_FIELDS.fanMode];
  const lowerInDegrees = decodeNumber(
    values[ENVIRONMENTAL_CARE_FIELDS.oscillationLowerAngle],
  );
  const upperInDegrees = decodeNumber(
    values[ENVIRONMENTAL_CARE_FIELDS.oscillationUpperAngle],
  );
  const sleepTimer = values[ENVIRONMENTAL_CARE_FIELDS.sleepTimer];
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
    nightMode: decodeSwitch(values[ENVIRONMENTAL_CARE_FIELDS.nightMode]),
    continuousMonitoring: decodeSwitch(
      values[ENVIRONMENTAL_CARE_FIELDS.continuousMonitoring],
    ),
    sleepTimerInMinutes:
      sleepTimer === ENVIRONMENTAL_CARE_SWITCH_CODES.off
        ? "off"
        : decodeNumber(sleepTimer),
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
  };
}

/** The fields a `STATE-SET` carries for a control: those the control sets.
 * An `autoMode` or a `fanSpeed` also switches the machine on, a `fanSpeed`
 * its auto mode off, and a `fanPower` of `false` its sleep timer off, unless
 * the control sets those itself. `type` says which fields the machine holds
 * its power and its auto mode in. */
export function applyEnvironmentalCareControl(
  type: EnvironmentalCareType,
  control: EnvironmentalCareControl,
): Record<string, string> {
  const data: Record<string, string> = {};
  const set = (field: string, value: string | undefined) => {
    if (value !== undefined) {
      data[field] = value;
    }
  };

  const fanRuns =
    control.autoMode !== undefined || control.fanSpeed !== undefined;
  const fanPower = control.fanPower ?? (fanRuns ? true : undefined);
  const autoMode =
    control.autoMode ?? (control.fanSpeed === undefined ? undefined : false);
  if (type.generation1) {
    set(ENVIRONMENTAL_CARE_FIELDS.fanMode, encodeFanMode(fanPower, autoMode));
  } else {
    set(ENVIRONMENTAL_CARE_FIELDS.fanPower, encodeSwitch(fanPower));
    // A type without an auto mode takes a fan speed alone.
    if (control.autoMode !== undefined || type.hasAutoMode) {
      set(ENVIRONMENTAL_CARE_FIELDS.autoMode, encodeSwitch(autoMode));
    }
  }
  if (control.fanSpeed !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.fanSpeed] = encodeNumber(control.fanSpeed);
  }

  if (control.oscillationMode !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.oscillationMode] =
      ENVIRONMENTAL_CARE_OSCILLATION_MODE_CODES[control.oscillationMode];
  }
  if (control.oscillationAngles !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.oscillationLowerAngle] = encodeNumber(
      control.oscillationAngles.lowerInDegrees,
    );
    data[ENVIRONMENTAL_CARE_FIELDS.oscillationUpperAngle] = encodeNumber(
      control.oscillationAngles.upperInDegrees,
    );
    data[ENVIRONMENTAL_CARE_FIELDS.oscillationPresetAngle] =
      ENVIRONMENTAL_CARE_CUSTOM_OSCILLATION_PRESET_ANGLE;
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
  if (control.heatMode !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.heatMode] =
      ENVIRONMENTAL_CARE_HEAT_MODE_CODES[control.heatMode];
  }
  if (control.targetTemperatureInC !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.targetTemperature] = String(
      Math.round((control.targetTemperatureInC + kelvinOffset(type)) * 10),
    );
  }
  if (control.humidificationMode !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.humidificationMode] =
      ENVIRONMENTAL_CARE_HUMIDIFICATION_MODE_CODES[control.humidificationMode];
  }
  set(
    ENVIRONMENTAL_CARE_FIELDS.autoHumidification,
    encodeSwitch(control.autoHumidification),
  );
  if (control.manualHumidificationTargetInPercent !== undefined) {
    data[ENVIRONMENTAL_CARE_FIELDS.manualHumidificationTarget] = encodeNumber(
      control.manualHumidificationTargetInPercent,
    );
  }
  return data;
}

export function parseEnvironmentalCareSensors(
  values: Record<string, string>,
  type: EnvironmentalCareType,
): EnvironmentalCareSensors {
  const fields = ENVIRONMENTAL_CARE_SENSOR_FIELDS;
  return {
    temperatureInC: decodeTemperature(values[fields.temperature], type),
    humidityInPercent: decodeNumber(values[fields.humidity]),
    pm25InMicrogramsPerCubicMetre: decodeNumber(
      values[fields.highResolutionPm25],
    ),
    pm25Index: decodeTenths(values[fields.pm25]),
    pm10InMicrogramsPerCubicMetre: decodeNumber(
      values[fields.highResolutionPm10],
    ),
    pm10Index: decodeTenths(values[fields.pm10]),
    volatileOrganicCompoundsIndex: decodeTenths(
      values[fields.generation2VolatileOrganicCompounds],
    ),
    nitrogenDioxideIndex: decodeTenths(values[fields.nitrogenDioxide]),
    formaldehydeInMicrogramsPerCubicMetre: decodeNumber(
      values[fields.highResolutionFormaldehyde],
    ),
    formaldehydeIndex: decodeTenths(values[fields.formaldehyde]),
    carbonDioxideInPpm: decodeNumber(
      values[fields.highResolutionCarbonDioxide],
    ),
    carbonDioxideIndex: decodeTenths(values[fields.carbonDioxide]),
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

function decodeNumber(value: string | undefined): number | null {
  return value !== undefined && /^\d+$/.test(value)
    ? Number.parseInt(value, 10)
    : null;
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

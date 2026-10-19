export { type GetCountriesOptions, getCountries } from "./cloud/countries.js";
export {
  type LoginOptions,
  login,
  type RequestLoginCodeOptions,
  requestLoginCode,
} from "./cloud/login.js";
export { type GetMachinesOptions, getMachines } from "./cloud/machines.js";
export type {
  DysonAccount,
  DysonRegion,
  LoginCredentials,
} from "./cloud/models/account.js";
export {
  type DysonMachine,
  MACHINE_CATEGORIES,
  type MachineCategory,
  REMOTE_BROKER_TYPES,
  type RemoteBrokerType,
} from "./cloud/models/machine.js";
export type { DysonRetryOptions } from "./cloud/transport.js";
export {
  EnvironmentalCareClient,
  type EnvironmentalCareClientOptions,
} from "./environmentalCare/client.js";
export {
  type EnvironmentalCareCapabilities,
  FILTERS,
  type Filter,
  type OscillationKind,
} from "./environmentalCare/models/capabilities.js";
export type { EnvironmentalCareFaults } from "./environmentalCare/models/faults.js";
export {
  CLEAN_CYCLE_STATES,
  type CleanCycleState,
  type EnvironmentalCareControl,
  type EnvironmentalCareReading,
  type EnvironmentalCareSensors,
  type EnvironmentalCareState,
  FAN_AIR_DIRECTIONS,
  FAN_SPEEDS,
  type FanAirDirection,
  type FanSpeed,
  FIND_AND_FOLLOW_MODES,
  type FindAndFollowMode,
  HEAT_MODES,
  type HeatMode,
  HUMIDIFICATION_MODES,
  type HumidificationMode,
  INNER_FILTER_TYPES,
  type InnerFilterType,
  OSCILLATION_MODES,
  OSCILLATION_PRESET_ANGLES,
  OSCILLATION_STATES,
  type OscillationAngles,
  type OscillationMode,
  type OscillationPresetAngle,
  type OscillationState,
  OUTER_FILTER_TYPES,
  type OuterFilterType,
  TILT_ANGLES,
  type TiltAngle,
  WATER_HARDNESSES,
  type WaterHardness,
} from "./environmentalCare/models/state.js";
export { DysonConnectionError, DysonError } from "./error.js";

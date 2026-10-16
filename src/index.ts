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
export type {
  EnvironmentalCareCapabilities,
  OscillationKind,
} from "./environmentalCare/models/capabilities.js";
export {
  type EnvironmentalCareControl,
  type EnvironmentalCareSensors,
  type EnvironmentalCareState,
  FAN_AIR_DIRECTIONS,
  FAN_SPEEDS,
  type FanAirDirection,
  type FanSpeed,
  HEAT_MODES,
  type HeatMode,
  HUMIDIFICATION_MODES,
  type HumidificationMode,
  OSCILLATION_MODES,
  OSCILLATION_PRESET_ANGLES,
  type OscillationAngles,
  type OscillationMode,
  type OscillationPresetAngle,
} from "./environmentalCare/models/state.js";
export { DysonConnectionError, DysonError } from "./error.js";

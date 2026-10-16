export const MACHINE_CATEGORIES = [
  "environmentalCare",
  "robot",
  "lighting",
  "wearableEnvironmentalCare",
  "hairCare",
  "floorCare",
  "formulation",
  "oralCare",
] as const;

/** The kind of machine. `environmentalCare` is a purifier, fan, heater or
 * humidifier, and the only kind there is a client for. */
export type MachineCategory = (typeof MACHINE_CATEGORIES)[number];

export const REMOTE_BROKER_TYPES = ["awsIot", "rabbitMq"] as const;

/** The cloud broker a machine is reached through. A client connects to
 * `awsIot` alone: see UNSUPPORTED.md. */
export type RemoteBrokerType = (typeof REMOTE_BROKER_TYPES)[number];

/** A machine registered to an account, as `getMachines` finds it or as a
 * caller writes it by hand, carrying what a client needs to reach it. A
 * machine written by hand needs only `serialNumber` and `type` to connect,
 * but `EnvironmentalCareClient.capabilities` also reads `variant` and
 * `firmwareCapabilities`. */
export interface DysonMachine {
  serialNumber: string;
  /** The cloud's code for the kind of machine, such as `438`. It says how
   * the machine holds its state. */
  type: string;
  /** What the machine's topics start with. Left out when that is `type`. */
  mqttRootTopicLevel?: string;
  /** Left out when the cloud reports none, or one outside
   * `MachineCategory`. Each field below is left out when the cloud
   * reports none. */
  category?: MachineCategory;
  /** The name the machine was given. */
  name?: string;
  /** The cloud's code for the variant of `type`. */
  variant?: string;
  model?: string;
  /** The name the machine is sold under. */
  productName?: string;
  /** The machine's firmware, as the cloud last saw it. */
  firmwareVersion?: string;
  /** What the machine's firmware can do, as the cloud names it, such as
   * `AdvanceOscillationDay1`. */
  firmwareCapabilities?: string[];
  /** Left out means `awsIot`. */
  remoteBrokerType?: RemoteBrokerType;
}

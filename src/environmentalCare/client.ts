import type { DysonAccount } from "../cloud/models/account.js";
import type { DysonMachine } from "../cloud/models/machine.js";
import type { DysonRetryOptions } from "../cloud/transport.js";
import { DysonError } from "../error.js";
import { MachineLink } from "../machine/link.js";
import type { MachineMessage } from "../machine/protocol/message.js";
import type { EnvironmentalCareCapabilities } from "./models/capabilities.js";
import type {
  EnvironmentalCareControl,
  EnvironmentalCareSensors,
  EnvironmentalCareState,
  OscillationAngles,
} from "./models/state.js";
import { decodeEnvironmentalCareCapabilities } from "./protocol/capabilities.js";
import {
  buildEnvironmentalCareStateSet,
  type EnvironmentalCareMessageName,
  parseEnvironmentalCareMessage,
} from "./protocol/message.js";
import {
  applyEnvironmentalCareControl,
  parseEnvironmentalCareSensors,
  parseEnvironmentalCareState,
} from "./protocol/state.js";
import {
  ENVIRONMENTAL_CARE_COMMANDS,
  ENVIRONMENTAL_CARE_MESSAGES,
} from "./protocol/tables.js";
import {
  decodeEnvironmentalCareType,
  type EnvironmentalCareType,
} from "./protocol/type.js";

export interface EnvironmentalCareClientOptions {
  /** The account the machine is registered to, as `login` resolved with
   * it. */
  account: DysonAccount;
  /** How long, in milliseconds, a call waits for each of the cloud, the
   * broker and the machine's answer. Defaults to 10000: see
   * `MachineLinkOptions.timeoutInMs`. */
  timeoutInMs?: number;
  /** Sent as the `User-Agent` of each request to the cloud. Defaults to
   * `dyson-control`: see `DysonCloudTransportOptions.userAgent`. */
  userAgent?: string;
  /** The waits between retries of a refused or dropped connection, for a
   * call and for connecting again after the connection closes. Defaults to
   * 0, 50, 100, 200 and 400 ms: see `DysonRetryOptions.delaysInMs`. */
  retry?: DysonRetryOptions;
  /** Called with each state the machine sends while the client is
   * connected: one it sends by itself, changed or not, and its answer to a
   * `getState`, this client's or another's. Nothing comes before `connect`
   * or after `onDisconnect`. Defaults to doing nothing. */
  onState?: (state: EnvironmentalCareState) => void;
  /** Called with each set of readings the machine sends while the client
   * is connected: its answer to a `getSensors`, this client's or another's,
   * and any it sends by itself. When it sends one by itself is not known:
   * see UNSUPPORTED.md. Defaults to doing nothing. */
  onSensors?: (sensors: EnvironmentalCareSensors) => void;
  /** Called after the connection closed and the client opened another by
   * itself, once that one stayed open as long as it took to open. The
   * client received nothing in between: call `getState` for a
   * state that changed then. Defaults to doing nothing: see
   * `MachineLinkOptions.onReconnect`. */
  onReconnect?: () => void;
  /** Called when the connection closed and the client opened no other:
   * `disconnect` ended it, or connecting again failed. Nothing connects again
   * until `connect`. Defaults to doing nothing: see
   * `MachineLinkOptions.onDisconnect`. */
  onDisconnect?: () => void;
}

/** A purifier, fan, heater or humidifier: a machine of the
 * `environmentalCare` category. Call `connect` before any other method,
 * and `disconnect` when done with the machine: the client holds the connection
 * between the two, and opens another by itself when it closes. Every method
 * rejects with a `DysonError` when it fails, after retrying a refused or
 * dropped connection, and with status 503 when the client is not
 * connected. */
export class EnvironmentalCareClient {
  /** Which fields of `setState` the machine takes, read from its `type`,
   * `variant` and `firmwareCapabilities` without asking the machine. A
   * machine written by hand without the last two reads as a machine of its
   * type that has neither. */
  readonly capabilities: EnvironmentalCareCapabilities;
  private readonly link: MachineLink;
  private readonly type: EnvironmentalCareType;

  /** It sends nothing. It throws an `Error` for a machine of another
   * category, and for one whose `type` is no known environmental care
   * machine's: the type says how the machine holds its state. */
  constructor(
    machine: DysonMachine,
    private readonly options: EnvironmentalCareClientOptions,
  ) {
    if (
      machine.category !== undefined &&
      machine.category !== "environmentalCare"
    ) {
      throw new Error(
        `An EnvironmentalCareClient takes an environmental care machine, not one of category ${machine.category}`,
      );
    }
    const type = decodeEnvironmentalCareType(machine.type);
    if (type === undefined) {
      throw new Error(
        `${machine.type} is no known type of environmental care machine`,
      );
    }
    this.type = type;
    this.capabilities = decodeEnvironmentalCareCapabilities(machine, type);
    this.link = new MachineLink(machine, {
      ...options,
      onMessage: (message) => this.receive(message),
    });
  }

  /** Asks the cloud for credentials, connects to the broker and resolves
   * once the client receives what the machine sends. It asks the machine
   * nothing, so `onState` waits for the machine to send a state: call
   * `getState` for the one it holds now. Calling it while connected does
   * nothing. */
  connect(): Promise<void> {
    return this.link.connect();
  }

  /** Closes the connection to the broker, rejects the calls that wait
   * with status 503, and calls `onDisconnect` once it has closed. `connect` opens another. */
  disconnect(): Promise<void> {
    return this.link.disconnect();
  }

  /** Asks the machine for its controllable state. */
  async getState(): Promise<EnvironmentalCareState> {
    return parseEnvironmentalCareState(await this.getProductState(), this.type);
  }

  /** Changes part of the state, with one command and without reading the
   * machine first. An `autoMode` or a `fanSpeed` also switches the machine
   * on, a `fanPower` of `false` its sleep timer off, and an
   * `oscillationAngles` or an `oscillationPresetAngleInDegrees` its
   * oscillation on. It rejects with an
   * `Error`, and sends nothing, for a field or a value `capabilities` says
   * the machine does not take. It resolves once the broker has the command,
   * not once the machine has acted on it: `getState` then tells. */
  async setState(control: EnvironmentalCareControl): Promise<void> {
    const fields = fieldsNotTaken(this.capabilities, control);
    if (fields.length > 0) {
      throw new Error(
        `The machine takes no ${fields.join(", ")}: see EnvironmentalCareClient.capabilities`,
      );
    }
    const data = applyEnvironmentalCareControl(
      this.type,
      this.capabilities,
      control,
    );
    if (Object.keys(data).length > 0) {
      await this.setProductState(data);
    }
  }

  /** Asks the machine for its temperature, humidity and air quality
   * readings, and the sleep timer of a machine of the first generation. */
  async getSensors(): Promise<EnvironmentalCareSensors> {
    return parseEnvironmentalCareSensors(
      await this.request(
        ENVIRONMENTAL_CARE_COMMANDS.requestProductEnvironmentCurrentSensorData,
        ENVIRONMENTAL_CARE_MESSAGES.environmentalCurrentSensorData,
      ),
      this.type,
    );
  }

  // --- raw fields ------------------------------------------------------------

  /** Asks the machine for its `product-state`, as field -> value: every
   * field it reports, modelled or not. */
  async getProductState(): Promise<Record<string, string>> {
    return this.request(
      ENVIRONMENTAL_CARE_COMMANDS.requestCurrentState,
      ENVIRONMENTAL_CARE_MESSAGES.currentState,
    );
  }

  /** Sends a `STATE-SET` with the fields as given, such as
   * `{ fnsp: "0005" }`. */
  async setProductState(data: Record<string, string>): Promise<void> {
    await this.link.send(
      ENVIRONMENTAL_CARE_COMMANDS.stateSet,
      buildEnvironmentalCareStateSet(data),
    );
  }

  private receive(message: MachineMessage): void {
    const parsed = parseEnvironmentalCareMessage(message);
    if (parsed === undefined) {
      return;
    }
    if (
      parsed.name === ENVIRONMENTAL_CARE_MESSAGES.environmentalCurrentSensorData
    ) {
      this.options.onSensors?.(
        parseEnvironmentalCareSensors(parsed.values, this.type),
      );
    } else {
      this.options.onState?.(
        parseEnvironmentalCareState(parsed.values, this.type),
      );
    }
  }

  private async request(
    command: string,
    reply: EnvironmentalCareMessageName,
  ): Promise<Record<string, string>> {
    const message = parseEnvironmentalCareMessage(
      await this.link.request(command, reply),
    );
    if (message === undefined) {
      throw new DysonError(`The machine sent a ${reply} without fields`, 502);
    }
    return message.values;
  }
}

// Each field the capabilities leave out is one every machine takes.
function fieldsNotTaken(
  capabilities: EnvironmentalCareCapabilities,
  control: EnvironmentalCareControl,
): (keyof EnvironmentalCareControl)[] {
  const takes = <ValueT>(
    values: readonly ValueT[],
    value: ValueT | undefined,
  ) => value === undefined || values.includes(value);
  const taken: { [Field in keyof EnvironmentalCareControl]?: boolean } = {
    autoMode: capabilities.autoMode,
    oscillationMode:
      capabilities.oscillation !== "none" &&
      capabilities.oscillation !== "tilt",
    oscillationAngles:
      control.oscillationAngles === undefined ||
      takesOscillationAngles(
        capabilities.oscillationAngles,
        control.oscillationAngles,
      ),
    oscillationPresetAngleInDegrees: takes(
      capabilities.oscillationPresetAnglesInDegrees,
      control.oscillationPresetAngleInDegrees,
    ),
    continuousMonitoring: capabilities.continuousMonitoring,
    fanAirDirection: takes(
      capabilities.fanAirDirections,
      control.fanAirDirection,
    ),
    heatMode: takes(capabilities.heatModes, control.heatMode),
    targetTemperatureInC: capabilities.heatModes.length > 0,
    humidificationMode: takes(
      capabilities.humidificationModes,
      control.humidificationMode,
    ),
    autoHumidification: capabilities.autoHumidification,
    manualHumidificationTargetInPercent:
      capabilities.humidificationModes.length > 0,
  };
  return (Object.keys(control) as (keyof EnvironmentalCareControl)[]).filter(
    (field) => control[field] !== undefined && taken[field] === false,
  );
}

function takesOscillationAngles(
  range: OscillationAngles | null,
  angles: OscillationAngles,
): boolean {
  return (
    range !== null &&
    range.lowerInDegrees <= angles.lowerInDegrees &&
    angles.lowerInDegrees <= angles.upperInDegrees &&
    angles.upperInDegrees <= range.upperInDegrees
  );
}

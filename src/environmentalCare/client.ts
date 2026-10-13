import type { DysonAccount } from "../cloud/models/account.js";
import type { DysonMachine } from "../cloud/models/machine.js";
import { DysonError } from "../error.js";
import { MachineLink } from "../machine/link.js";
import type {
  EnvironmentalCareControl,
  EnvironmentalCareSensors,
  EnvironmentalCareState,
} from "./models/state.js";
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
}

/** A purifier, fan, heater or humidifier: a machine of the
 * `environmentalCare` category. It connects on the first call, and every
 * method rejects with a `DysonError` when its request fails. Call `close`
 * when done with the machine. */
export class EnvironmentalCareClient {
  private readonly link: MachineLink;
  private readonly type: EnvironmentalCareType;

  /** It sends nothing. It throws an `Error` for a machine of another
   * category, and for one whose `type` is no known environmental care
   * machine's: the type says how the machine holds its state. */
  constructor(machine: DysonMachine, options: EnvironmentalCareClientOptions) {
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
    this.link = new MachineLink(machine, options);
  }

  /** Close the connection to the broker. A call made afterwards connects
   * again. */
  close(): Promise<void> {
    return this.link.close();
  }

  /** Asks the machine for its controllable state. */
  async getState(): Promise<EnvironmentalCareState> {
    return parseEnvironmentalCareState(await this.getProductState(), this.type);
  }

  /** Changes part of the state, with one command and without reading the
   * machine first. An `autoMode` or a `fanSpeed` also switches the machine
   * on, and a `fanPower` of `false` its sleep timer off. It resolves once
   * the broker has the command, not once the machine has acted on it:
   * `getState` then tells. */
  async setState(control: EnvironmentalCareControl): Promise<void> {
    const data = applyEnvironmentalCareControl(this.type, control);
    if (Object.keys(data).length > 0) {
      await this.setProductState(data);
    }
  }

  /** Asks the machine for its temperature, humidity and air quality
   * readings. */
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

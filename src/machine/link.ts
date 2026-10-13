import { DysonConnection } from "../cloud/connection.js";
import type { DysonAccount } from "../cloud/models/account.js";
import type { DysonMachine } from "../cloud/models/machine.js";
import {
  DEFAULT_TIMEOUT_IN_MS,
  DysonCloudTransport,
} from "../cloud/transport.js";
import { DysonConnectionError, DysonError } from "../error.js";
import {
  buildMachineCommand,
  encodeMachineTopic,
  type MachineMessage,
  parseMachineMessage,
} from "./protocol/message.js";

export interface MachineLinkOptions {
  /** The account the machine is registered to, as `logIn` resolved with
   * it. */
  account: DysonAccount;
  /** How long, in milliseconds, a call waits for each of the cloud, the
   * broker and the machine's answer. Defaults to 10000. */
  timeoutInMs?: number;
}

interface Waiter {
  msg: string;
  resolve: (message: MachineMessage) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

/** The link to one machine through the cloud broker, which the client of
 * each kind of machine sends its commands over. It publishes to the
 * machine's `command` topic and receives from its `status/current` topic.
 *
 * It connects on the first call and holds the connection until it closes:
 * the call after that connects again, with new credentials. Every method
 * rejects with a `DysonError` when it fails. */
export class MachineLink {
  private readonly transport: DysonCloudTransport;
  private readonly timeoutInMs: number;
  private connection: Promise<DysonConnection> | undefined;
  private readonly waiters = new Set<Waiter>();

  /** It sends nothing. */
  constructor(
    private readonly machine: DysonMachine,
    options: MachineLinkOptions,
  ) {
    this.timeoutInMs = options.timeoutInMs ?? DEFAULT_TIMEOUT_IN_MS;
    this.transport = new DysonCloudTransport({
      country: options.account.country,
      account: options.account,
      timeoutInMs: this.timeoutInMs,
    });
  }

  /** Sends a command, with `fields` beside its `msg`. It resolves once the
   * broker has it. */
  async send(msg: string, fields?: Record<string, unknown>): Promise<void> {
    const connection = await this.connect();
    await connection.publish(
      encodeMachineTopic(this.machine, "command"),
      buildMachineCommand(msg, new Date(), fields),
    );
  }

  /** Sends a command and resolves with the next message whose `msg` is
   * `reply`. It rejects with status 504 when none comes in time. */
  async request(msg: string, reply: string): Promise<MachineMessage> {
    await this.connect();
    // Waiting from before the publish, so a fast answer is not missed.
    const [message] = await Promise.all([
      this.nextMessage(reply),
      this.send(msg),
    ]);
    return message;
  }

  /** Close the connection to the broker. A call made afterwards connects
   * again. */
  async close(): Promise<void> {
    const connection = this.connection;
    if (connection === undefined) {
      return;
    }
    // A connection that failed to open left nothing to close.
    await (await connection.catch(() => undefined))?.close();
  }

  private nextMessage(msg: string): Promise<MachineMessage> {
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        msg,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters.delete(waiter);
          reject(new DysonError(`The machine sent no ${msg} in time`, 504));
        }, this.timeoutInMs),
      };
      this.waiters.add(waiter);
    });
  }

  private receive(payload: string): void {
    const message = parseMachineMessage(payload);
    if (message === undefined) {
      return;
    }
    for (const waiter of this.waiters) {
      if (waiter.msg === message.msg) {
        this.waiters.delete(waiter);
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      }
    }
  }

  private connect(): Promise<DysonConnection> {
    this.connection ??= DysonConnection.open(this.machine, this.transport, {
      topic: encodeMachineTopic(this.machine, "status"),
      timeoutInMs: this.timeoutInMs,
      onMessage: (payload) => this.receive(payload),
      onClose: () => this.drop(),
    }).catch((error: unknown) => {
      this.connection = undefined;
      throw error;
    });
    return this.connection;
  }

  private drop(): void {
    this.connection = undefined;
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(
        new DysonConnectionError("The connection to the Dyson broker closed"),
      );
    }
    this.waiters.clear();
  }
}

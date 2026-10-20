import { randomBytes } from "node:crypto";
import { getCloudBroker } from "../cloud/broker.js";
import { type DysonBroker, DysonConnection } from "../cloud/connection.js";
import type { DysonAccount } from "../cloud/models/account.js";
import type { DysonMachine } from "../cloud/models/machine.js";
import {
  DEFAULT_TIMEOUT_IN_MS,
  DysonCloudTransport,
  type DysonRetryOptions,
  withRetry,
} from "../cloud/transport.js";
import { DysonConnectionError, DysonError } from "../error.js";
import { findMachineBroker } from "./broker.js";
import type { HostType } from "./models/hostType.js";
import { buildMachineBroker } from "./protocol/broker.js";
import {
  buildMachineCommand,
  encodeMachineTopic,
  type MachineMessage,
  parseMachineMessage,
} from "./protocol/message.js";
import { MACHINE_BROKER_PORT, MACHINE_TOPICS } from "./protocol/tables.js";

/** Which broker reaches the machine: its own on the LAN, at `host` or
 * found by searching the LAN, and the cloud's after it with `account`; or
 * the cloud's alone, with `local: false`. */
export type MachineLinkBrokerOptions =
  | {
      /** The account the machine is registered to, as `login` resolved
       * with it. A connection goes through the cloud's broker, with
       * credentials the cloud hands out for it, when the machine's own
       * broker fails to open one. Without it nothing is asked of the
       * cloud. */
      account?: DysonAccount;
      /** The machine's host name or IPv4 address on the LAN, in place of
       * searching the LAN for it. A host that answers nothing or does not
       * resolve costs up to `timeoutInMs`. */
      host?: string;
      /** Whether a connection tries the machine's own broker on the LAN.
       * Defaults to true. */
      local?: true;
    }
  | {
      /** The account the machine is registered to, as `login` resolved
       * with it. Each connection goes through the cloud's broker, with
       * credentials the cloud hands out for it. */
      account: DysonAccount;
      host?: undefined;
      /** False to go through the cloud's broker alone, and not search the
       * LAN first, which costs 3 seconds for a machine not on it. */
      local: false;
    };

interface BrokerRoute {
  hostType: HostType;
  getBroker: () => Promise<DysonBroker>;
}

interface OpenConnection {
  connection: DysonConnection;
  hostType: HostType;
}

export type MachineLinkOptions = MachineLinkBrokerOptions & {
  /** The topics the machine reports on, each as what follows its root topic
   * level and serial number, such as `status/current`. */
  topics: readonly string[];
  /** How long, in milliseconds, a call waits for each of the cloud, the
   * broker and the machine's answer. Defaults to 10000. */
  timeoutInMs?: number;
  /** Sent as the `User-Agent` of each request to the cloud. Defaults to
   * `dyson-control`: see `DysonCloudTransportOptions.userAgent`. */
  userAgent?: string;
  /** The waits between retries of a refused or dropped connection, for a
   * call and for connecting again after the connection closes. Defaults to
   * 0, 50, 100, 200 and 400 ms: see `DysonRetryOptions.delaysInMs`. */
  retry?: DysonRetryOptions;
  /** Called with each message the machine sends while the link is
   * connected, the answer to a `request` included. A machine answers on the
   * topics every client receives from, so the answer to another client's
   * command comes too. Defaults to doing nothing. */
  onMessage?: (message: MachineMessage) => void;
  /** Called after the connection closed and the link opened another by
   * itself, once that one stayed open as long as it took to open. The link
   * received nothing in between, so what the machine sent then is lost.
   * Defaults to doing nothing. */
  onReconnect?: () => void;
  /** Called when the connection closed and the link opened no other:
   * `disconnect` ended it, or connecting again failed. Nothing connects again
   * until `connect`. Defaults to doing nothing. */
  onDisconnect?: () => void;
};

interface Waiter {
  msg: string;
  resolve: (message: MachineMessage) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

/** The link to one machine through a broker, the cloud's or the machine's
 * own, which the client of each kind of machine sends its commands over. It
 * publishes to the machine's `command` topic and receives from the topics it
 * is given.
 *
 * It holds a connection from `connect` until `disconnect`, connecting again by
 * itself, with new credentials from the cloud, when the connection closes any
 * other way.
 * Every method rejects with a `DysonError` when it fails, after retrying a
 * refused or dropped connection. */
export class MachineLink {
  // The brokers a connection tries, in order.
  private readonly routes: BrokerRoute[] = [];
  private readonly timeoutInMs: number;
  private readonly topics: MachineLinkOptions["topics"];
  private readonly retry: MachineLinkOptions["retry"];
  private readonly onMessage: MachineLinkOptions["onMessage"];
  private readonly onReconnect: MachineLinkOptions["onReconnect"];
  private readonly onDisconnect: MachineLinkOptions["onDisconnect"];
  private connection: Promise<OpenConnection> | undefined;
  private openHostType: HostType | null = null;
  // From `connect` until `disconnect`, or until connecting again fails: whether
  // a call may connect, and a connection that closes is opened again.
  private open = false;
  private reconnecting = false;
  // Counts the calls to `disconnect`, so a reconnect that one cut short
  // leaves calling back to it.
  private disconnects = 0;
  private readonly waiters = new Set<Waiter>();

  /** It sends nothing. It throws an `Error` for a machine without an
   * `apPasswordHash`, but one given an `account` and no `host`, which it
   * reaches through the cloud alone, as it does one given `local: false`. */
  constructor(
    private readonly machine: DysonMachine,
    options: MachineLinkOptions,
  ) {
    this.topics = options.topics;
    this.timeoutInMs = options.timeoutInMs ?? DEFAULT_TIMEOUT_IN_MS;
    this.retry = options.retry;
    this.onMessage = options.onMessage;
    this.onReconnect = options.onReconnect;
    this.onDisconnect = options.onDisconnect;
    const { apPasswordHash } = machine;
    if (options.local !== false) {
      if (apPasswordHash !== undefined) {
        // Its own client id, so the broker closes no other program's
        // connection to the machine when this one opens. The broker refuses
        // one longer than 23 characters.
        const clientId = randomBytes(8).toString("hex");
        const { host } = options;
        const getBroker =
          host === undefined
            ? () => findMachineBroker(machine, apPasswordHash, clientId)
            : async () =>
                buildMachineBroker(
                  machine,
                  { host, port: MACHINE_BROKER_PORT },
                  apPasswordHash,
                  clientId,
                );
        this.routes.push({ hostType: "local", getBroker });
      } else if (options.host !== undefined || options.account === undefined) {
        throw new Error(
          "A machine reached on the LAN needs the apPasswordHash that getMachines reads",
        );
      }
    }
    if (options.account !== undefined) {
      const transport = new DysonCloudTransport({
        country: options.account.country,
        account: options.account,
        timeoutInMs: this.timeoutInMs,
        userAgent: options.userAgent,
      });
      this.routes.push({
        hostType: "remote",
        getBroker: () => getCloudBroker(machine, transport),
      });
    }
  }

  /** The broker the open connection goes through, or `null` while none is
   * open. */
  get hostType(): HostType | null {
    return this.openHostType;
  }

  /** Connects to the broker, with new credentials when it is the cloud's,
   * and resolves once the link receives what the machine sends. Calling it
   * while connected does nothing. */
  async connect(): Promise<void> {
    this.open = true;
    try {
      await withRetry(() => this.openConnection(), this.retry);
    } catch (error) {
      this.open = false;
      throw error;
    }
  }

  /** Sends a command, with `fields` beside its `msg`. It resolves once the
   * broker has it. */
  async send(msg: string, fields?: Record<string, unknown>): Promise<void> {
    await withRetry(() => this.publish(msg, fields), this.retry);
  }

  /** Sends a command and resolves with the next message whose `msg` is
   * `reply`. It rejects with status 504 when none comes in time. */
  async request(msg: string, reply: string): Promise<MachineMessage> {
    return withRetry(async () => {
      await this.openConnection();
      // Waiting from before the publish, so a fast answer is not missed.
      const [message] = await Promise.all([
        this.nextMessage(reply),
        this.publish(msg),
      ]);
      return message;
    }, this.retry);
  }

  /** Closes the connection to the broker, rejects the calls that wait
   * with status 503, and calls `onDisconnect` once it has closed. */
  async disconnect(): Promise<void> {
    const wasOpen = this.open;
    this.open = false;
    this.disconnects += 1;
    // A connection that failed to open left nothing to close.
    await (await this.connection?.catch(() => undefined))?.connection.close();
    if (wasOpen) {
      this.onDisconnect?.();
    }
  }

  private async publish(
    msg: string,
    fields?: Record<string, unknown>,
  ): Promise<void> {
    const { connection, hostType } = await this.openConnection();
    await connection.publish(
      encodeMachineTopic(this.machine, MACHINE_TOPICS.command),
      buildMachineCommand(msg, new Date(), hostType, fields),
    );
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
    this.onMessage?.(message);
  }

  private openConnection(): Promise<OpenConnection> {
    if (!this.open) {
      // Not a `DysonConnectionError`, which `withRetry` would repeat.
      return Promise.reject(
        new DysonError("Not connected: call connect first", 503),
      );
    }
    this.connection ??= this.openFirstRoute().catch((error: unknown) => {
      this.connection = undefined;
      throw error;
    });
    return this.connection;
  }

  // Rejects with what the last route failed with.
  private async openFirstRoute(): Promise<OpenConnection> {
    let failure: unknown;
    for (const route of this.routes) {
      try {
        const connection = await DysonConnection.open(await route.getBroker(), {
          topics: this.topics.map((topic) =>
            encodeMachineTopic(this.machine, topic),
          ),
          timeoutInMs: this.timeoutInMs,
          onMessage: (payload) => this.receive(payload),
          onClose: () => this.drop(),
        });
        this.openHostType = route.hostType;
        return { connection, hostType: route.hostType };
      } catch (error) {
        failure = error;
      }
    }
    throw failure;
  }

  private drop(): void {
    this.connection = undefined;
    this.openHostType = null;
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(
        new DysonConnectionError("The connection to the Dyson broker closed"),
      );
    }
    this.waiters.clear();
    if (this.open && !this.reconnecting) {
      void this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    this.reconnecting = true;
    const disconnects = this.disconnects;
    const reopened = await withRetry(() => this.reopen(), this.retry).then(
      () => true,
      () => false,
    );
    this.reconnecting = false;
    if (this.disconnects !== disconnects) {
      return;
    }
    // A call opens a connection of its own while the link reconnects, and
    // one that outlasted the link's last attempt holds the link open.
    if (reopened || this.connection !== undefined) {
      this.onReconnect?.();
      return;
    }
    this.open = false;
    this.onDisconnect?.();
  }

  // A connection counts as open again once it stays open as long as it took
  // to open, and one that closes sooner as a failed attempt: a broker that
  // closed each connection it accepted would otherwise have the link ask
  // the cloud for credentials without end.
  private async reopen(): Promise<void> {
    const startedAt = Date.now();
    const connection = this.openConnection();
    await connection;
    const openingInMs = Date.now() - startedAt;
    await new Promise((resolve) => setTimeout(resolve, openingInMs));
    if (this.connection !== connection) {
      throw new DysonConnectionError(
        "The Dyson broker closed the connection as soon as it opened",
      );
    }
  }
}

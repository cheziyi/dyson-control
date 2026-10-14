import { DysonConnection } from "../cloud/connection.js";
import type { DysonAccount } from "../cloud/models/account.js";
import type { DysonMachine } from "../cloud/models/machine.js";
import {
  DEFAULT_TIMEOUT_IN_MS,
  DysonCloudTransport,
  type DysonRetryOptions,
  withRetry,
} from "../cloud/transport.js";
import { DysonConnectionError, DysonError } from "../error.js";
import {
  buildMachineCommand,
  encodeMachineTopic,
  type MachineMessage,
  parseMachineMessage,
} from "./protocol/message.js";

export interface MachineLinkOptions {
  /** The account the machine is registered to, as `login` resolved with
   * it. */
  account: DysonAccount;
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
   * one topic every client receives from, so the answer to another client's
   * command comes too. Defaults to doing nothing. */
  onMessage?: (message: MachineMessage) => void;
  /** Called after the connection closed and the link opened another by
   * itself, once that one stayed open as long as it took to open. The link
   * received nothing in between, so what the machine sent then is lost.
   * Defaults to doing nothing. */
  onReconnect?: () => void;
  /** Called when the connection closed and the link opened no other:
   * `close` closed it, or connecting again failed. Nothing connects again
   * until `connect`. Defaults to doing nothing. */
  onClose?: () => void;
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
 * It holds a connection from `connect` until `close`, connecting again by
 * itself, with new credentials, when the connection closes any other way.
 * Every method rejects with a `DysonError` when it fails, after retrying a
 * refused or dropped connection. */
export class MachineLink {
  private readonly transport: DysonCloudTransport;
  private readonly timeoutInMs: number;
  private readonly retry: MachineLinkOptions["retry"];
  private readonly onMessage: MachineLinkOptions["onMessage"];
  private readonly onReconnect: MachineLinkOptions["onReconnect"];
  private readonly onClose: MachineLinkOptions["onClose"];
  private connection: Promise<DysonConnection> | undefined;
  // From `connect` until `close`, or until connecting again fails: whether
  // a call may connect, and a connection that closes is opened again.
  private open = false;
  private reconnecting = false;
  // Counts the calls to `close`, so a reconnect that `close` cut short
  // leaves calling back to it.
  private closes = 0;
  private readonly waiters = new Set<Waiter>();

  /** It sends nothing. */
  constructor(
    private readonly machine: DysonMachine,
    options: MachineLinkOptions,
  ) {
    this.timeoutInMs = options.timeoutInMs ?? DEFAULT_TIMEOUT_IN_MS;
    this.retry = options.retry;
    this.onMessage = options.onMessage;
    this.onReconnect = options.onReconnect;
    this.onClose = options.onClose;
    this.transport = new DysonCloudTransport({
      country: options.account.country,
      account: options.account,
      timeoutInMs: this.timeoutInMs,
      userAgent: options.userAgent,
    });
  }

  /** Asks the cloud for credentials, connects to the broker and resolves
   * once the link receives what the machine sends. Calling it while
   * connected does nothing. */
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

  /** Close the connection to the broker, and reject the calls that wait
   * with status 503. */
  async close(): Promise<void> {
    const wasOpen = this.open;
    this.open = false;
    this.closes += 1;
    // A connection that failed to open left nothing to close.
    await (await this.connection?.catch(() => undefined))?.close();
    if (wasOpen) {
      this.onClose?.();
    }
  }

  private async publish(
    msg: string,
    fields?: Record<string, unknown>,
  ): Promise<void> {
    const connection = await this.openConnection();
    await connection.publish(
      encodeMachineTopic(this.machine, "command"),
      buildMachineCommand(msg, new Date(), fields),
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

  private openConnection(): Promise<DysonConnection> {
    if (!this.open) {
      // Not a `DysonConnectionError`, which `withRetry` would repeat.
      return Promise.reject(
        new DysonError("Not connected: call connect first", 503),
      );
    }
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
    if (this.open && !this.reconnecting) {
      void this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    this.reconnecting = true;
    const closes = this.closes;
    const reopened = await withRetry(() => this.reopen(), this.retry).then(
      () => true,
      () => false,
    );
    this.reconnecting = false;
    if (this.closes !== closes) {
      return;
    }
    // A call opens a connection of its own while the link reconnects, and
    // one that outlasted the link's last attempt holds the link open.
    if (reopened || this.connection !== undefined) {
      this.onReconnect?.();
      return;
    }
    this.open = false;
    this.onClose?.();
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

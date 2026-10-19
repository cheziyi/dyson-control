import { connectAsync, type MqttClient } from "mqtt";
import { DysonConnectionError, DysonError } from "../error.js";
import type { DysonMachine } from "./models/machine.js";
import {
  buildIotCredentialsRequest,
  encodeIotUsername,
  parseIotCredentials,
} from "./protocol/iotCredentials.js";
import {
  CLOUD_BROKER_ALPN_PROTOCOL,
  CLOUD_BROKER_PORT,
  CLOUD_ROUTES,
} from "./protocol/tables.js";
import type { DysonCloudTransport } from "./transport.js";

// The CONNACK return codes for a username or password the broker rejects,
// and for a client it does not authorise.
const REFUSED_CREDENTIALS_CODES = new Set([4, 5]);

// What a SUBACK grants a subscription the broker refuses, in place of a
// quality of service.
const REFUSED_SUBSCRIPTION_CODE = 128;

export interface DysonConnectionOptions {
  /** The topics to receive from, each subscribed before `open`
   * resolves. */
  topics: string[];
  /** How long, in milliseconds, to wait for the broker to accept the
   * connection before `open` rejects with a `DysonError` with status 504. */
  timeoutInMs: number;
  /** Called with the payload of each message on any of `topics`, as
   * text. */
  onMessage: (payload: string) => void;
  /** Called once, when a connection `open` resolved with closes for any
   * reason, `close` included. */
  onClose: () => void;
}

/** One MQTT connection to the cloud broker, for one machine. It never
 * reconnects: the credentials it was opened with are for one connection, so
 * its owner opens another: see DESIGN.md#credentials-for-one-connection. */
export class DysonConnection {
  private constructor(private readonly client: MqttClient) {}

  /** Asks the cloud for the machine's broker credentials through
   * `transport`, and connects with them.
   *
   * It rejects with whatever `transport` throws, with a `DysonError` with
   * status 401 when the broker refuses the credentials or the subscription,
   * 504 when it does not answer in time and 501 for a machine on the
   * RabbitMQ broker, and with a `DysonConnectionError` for any other
   * failure. */
  static async open(
    machine: DysonMachine,
    transport: DysonCloudTransport,
    options: DysonConnectionOptions,
  ): Promise<DysonConnection> {
    if (machine.remoteBrokerType === "rabbitMq") {
      throw new DysonError(
        "A machine on the RabbitMQ broker is not supported",
        501,
      );
    }
    const credentials = parseIotCredentials(
      await transport.send({
        method: "POST",
        path: CLOUD_ROUTES.iotCredentials,
        jsonBody: buildIotCredentialsRequest(machine.serialNumber),
      }),
    );

    let client: MqttClient;
    try {
      client = await connectAsync(
        `mqtts://${credentials.endpoint}:${CLOUD_BROKER_PORT}`,
        {
          // On port 443 the broker tells MQTT from HTTPS by this.
          ALPNProtocols: [CLOUD_BROKER_ALPN_PROTOCOL],
          clientId: credentials.clientId,
          username: encodeIotUsername(credentials),
          connectTimeout: options.timeoutInMs,
          // No reconnecting with credentials that were for one connection.
          reconnectPeriod: 0,
        },
        // Without it a connection the broker closes never rejects.
        false,
      );
    } catch (error) {
      throw openError(error);
    }

    // An EventEmitter throws an error nothing listens for, and `close`
    // follows each one.
    client.on("error", () => {});
    client.on("message", (_topic, payload) => {
      options.onMessage(payload.toString("utf8"));
    });

    const connection = new DysonConnection(client);
    let granted: { qos: number }[];
    try {
      granted = await client.subscribeAsync(options.topics, { qos: 1 });
    } catch (error) {
      await connection.close();
      throw new DysonConnectionError(
        `Subscribing to ${options.topics.join(", ")} failed: ${String(error)}`,
      );
    }
    // The MQTT library resolves for a subscription the broker refuses, and
    // no message would ever arrive.
    if (granted.some((each) => each.qos === REFUSED_SUBSCRIPTION_CODE)) {
      await connection.close();
      throw new DysonError(
        `The Dyson broker refused the subscription to ${options.topics.join(", ")}`,
        401,
      );
    }
    if (!client.connected) {
      throw new DysonConnectionError(
        "The Dyson broker closed the connection as it opened",
      );
    }
    client.on("close", options.onClose);
    return connection;
  }

  /** Resolves once the broker acknowledges the message. */
  async publish(topic: string, payload: string): Promise<void> {
    try {
      await this.client.publishAsync(topic, payload, { qos: 1 });
    } catch (error) {
      throw new DysonConnectionError(
        `Publishing to ${topic} failed: ${String(error)}`,
      );
    }
  }

  async close(): Promise<void> {
    await this.client.endAsync();
  }
}

function openError(error: unknown): DysonError {
  const message = `Connecting to the Dyson broker failed: ${String(error)}`;
  const { code } = error as { code?: unknown };
  if (typeof code === "number" && REFUSED_CREDENTIALS_CODES.has(code)) {
    return new DysonError(message, 401);
  }
  if (error instanceof Error && error.message === "connack timeout") {
    return new DysonError(message, 504);
  }
  return new DysonConnectionError(message);
}

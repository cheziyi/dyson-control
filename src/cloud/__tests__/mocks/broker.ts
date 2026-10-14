import { EventEmitter } from "node:events";
import { connectAsync } from "mqtt";
import { beforeEach, vi } from "vitest";
import { type CloudRequest, json, useMockCloud } from "./cloud.js";

export const MACHINE = { serialNumber: "S-1", type: "438" };
export const COMMAND_TOPIC = "438/S-1/command";
export const STATUS_TOPIC = "438/S-1/status/current";

const CREDENTIALS = {
  Endpoint: "broker.example.com",
  IoTCredentials: {
    ClientId: "client-1",
    CustomAuthorizerName: "authorizer",
    TokenKey: "token",
    TokenValue: "value-1",
    TokenSignature: "signature",
  },
};

export interface Published {
  topic: string;
  message: { msg: string; [field: string]: unknown };
}

/** The broker and the machine behind it, in place of the MQTT library's
 * client: it records what is published, and answers a command with the
 * messages `answers` holds for its `msg`. */
export class Broker extends EventEmitter {
  readonly published: Published[] = [];
  readonly subscribed: string[] = [];
  answers: Record<string, unknown[]> = {};
  /** What the SUBACK grants each subscription: 128 refuses it. */
  grantedQos = 1;
  connected = true;

  async subscribeAsync(topic: string): Promise<{ qos: number }[]> {
    this.subscribed.push(topic);
    return [{ qos: this.grantedQos }];
  }

  async publishAsync(topic: string, payload: string): Promise<void> {
    const message = JSON.parse(payload) as Published["message"];
    this.published.push({ topic, message });
    for (const answer of this.answers[message.msg] ?? []) {
      this.send(answer);
    }
  }

  async endAsync(): Promise<void> {
    this.drop();
  }

  /** The broker closes the connection. */
  drop(): void {
    this.connected = false;
    this.emit("close");
  }

  /** A message from the machine. */
  send(message: unknown): void {
    this.emit("message", STATUS_TOPIC, Buffer.from(JSON.stringify(message)));
  }

  commands(): string[] {
    return this.published.map((each) => each.message.msg);
  }
}

export interface MockBroker {
  /** The broker of the latest connection. */
  broker: Broker;
  /** The requests for broker credentials the cloud was sent. */
  credentialRequests: CloudRequest[];
  /** The HTTP status the cloud answers a request for credentials with. */
  credentialStatusCode: number;
}

/** Puts a `Broker` behind the MQTT library and has the cloud hand out
 * credentials for it, for each test of the file. The file itself mocks the
 * library: `vi.mock("mqtt", () => ({ connectAsync: vi.fn() }))`. */
export function useMockBroker(): MockBroker {
  const cloud = useMockCloud();
  const mock: MockBroker = {
    broker: new Broker(),
    credentialRequests: [],
    credentialStatusCode: 200,
  };

  beforeEach(() => {
    mock.broker = new Broker();
    mock.credentialRequests = cloud.requests;
    mock.credentialStatusCode = 200;
    vi.mocked(connectAsync)
      .mockReset()
      .mockImplementation(async () => {
        // A connection that closed is not opened again: the next one gets a
        // broker of its own, which answers as the last one did.
        if (!mock.broker.connected) {
          const { answers, grantedQos } = mock.broker;
          mock.broker = Object.assign(new Broker(), { answers, grantedQos });
        }
        return mock.broker as unknown as Awaited<
          ReturnType<typeof connectAsync>
        >;
      });
    cloud.reply = () => json(CREDENTIALS, mock.credentialStatusCode);
  });

  return mock;
}

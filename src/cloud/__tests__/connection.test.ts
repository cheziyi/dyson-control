import { connectAsync } from "mqtt";
import { describe, expect, it, vi } from "vitest";
import { DysonConnectionError } from "../../error.js";
import { type DysonBroker, DysonConnection } from "../connection.js";
import { STATUS_TOPIC, useMockBroker } from "./mocks/broker.js";

vi.mock("mqtt", () => ({ connectAsync: vi.fn() }));

const mock = useMockBroker();

const BROKER: DysonBroker = {
  url: "mqtt://S-1.local:1883",
  clientId: "S-1",
  username: "S-1",
  password: "hash-1",
};

function open() {
  const received: string[] = [];
  const onClose = vi.fn();
  return {
    received,
    onClose,
    connection: DysonConnection.open(BROKER, {
      topics: [STATUS_TOPIC],
      timeoutInMs: 1000,
      onMessage: (payload) => received.push(payload),
      onClose,
    }),
  };
}

describe("DysonConnection", () => {
  it("connects with the broker's login, never reconnects, and subscribes", async () => {
    await open().connection;

    expect(connectAsync).toHaveBeenCalledExactlyOnceWith(
      "mqtt://S-1.local:1883",
      {
        clientId: "S-1",
        username: "S-1",
        password: "hash-1",
        connectTimeout: 1000,
        reconnectPeriod: 0,
      },
      false,
    );
    expect(mock.broker.subscribed).toEqual([STATUS_TOPIC]);
  });

  it("passes on each message as text, and the close", async () => {
    const { connection, received, onClose } = open();
    await connection;

    mock.broker.send({ msg: "HELLO" });
    await (await connection).close();

    expect(received).toEqual(['{"msg":"HELLO"}']);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("publishes with the payload as given", async () => {
    const connection = await open().connection;

    await connection.publish("438/S-1/command", '{"msg":"STATE-SET"}');

    expect(mock.broker.published).toEqual([
      { topic: "438/S-1/command", message: { msg: "STATE-SET" } },
    ]);
  });

  it.each([
    ["status 401 for credentials the broker refuses", { code: 5 }, 401],
    ["status 504 for a broker that does not answer", {}, 504],
  ])("rejects with %s", async (_name, fields, httpStatusCode) => {
    vi.mocked(connectAsync).mockRejectedValue(
      Object.assign(new Error("connack timeout"), fields),
    );

    await expect(open().connection).rejects.toMatchObject({ httpStatusCode });
  });

  it("rejects with status 401 for a subscription the broker refuses, and closes", async () => {
    mock.broker.grantedQos = 128;
    const { connection, onClose } = open();

    await expect(connection).rejects.toMatchObject({ httpStatusCode: 401 });
    expect(mock.broker.connected).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("rejects with a DysonConnectionError for a connection that closes as it opens", async () => {
    mock.broker.subscribeAsync = async () => {
      mock.broker.drop();
      return [{ qos: 1 }];
    };
    const { connection, onClose } = open();

    await expect(connection).rejects.toBeInstanceOf(DysonConnectionError);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("rejects with a DysonConnectionError for any other failure to connect", async () => {
    vi.mocked(connectAsync).mockRejectedValue(
      new Error("Couldn't connect to server"),
    );

    await expect(open().connection).rejects.toBeInstanceOf(
      DysonConnectionError,
    );
  });
});

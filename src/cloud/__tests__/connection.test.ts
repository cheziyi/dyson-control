import { connectAsync } from "mqtt";
import { describe, expect, it, vi } from "vitest";
import { DysonConnectionError } from "../../error.js";
import { DysonConnection } from "../connection.js";
import { DysonCloudTransport } from "../transport.js";
import { MACHINE, STATUS_TOPIC, useMockBroker } from "./mocks/broker.js";
import { ACCOUNT } from "./mocks/cloud.js";

vi.mock("mqtt", () => ({ connectAsync: vi.fn() }));

const mock = useMockBroker();

function open(machine = MACHINE) {
  const received: string[] = [];
  const onClose = vi.fn();
  return {
    received,
    onClose,
    connection: DysonConnection.open(
      machine,
      new DysonCloudTransport({ country: "GB", account: ACCOUNT }),
      {
        topic: STATUS_TOPIC,
        timeoutInMs: 1000,
        onMessage: (payload) => received.push(payload),
        onClose,
      },
    ),
  };
}

describe("DysonConnection", () => {
  it("asks the cloud for credentials, connects with them and subscribes", async () => {
    await open().connection;

    expect(mock.credentialRequests).toMatchObject([
      {
        method: "POST",
        url: "https://appapi.cp.dyson.com/v2/authorize/iot-credentials",
        headers: { Authorization: "Bearer abc" },
        body: { Serial: "S-1" },
      },
    ]);
    expect(connectAsync).toHaveBeenCalledExactlyOnceWith(
      "mqtts://broker.example.com:443",
      {
        ALPNProtocols: ["mqtt"],
        clientId: "client-1",
        username:
          "?x-amz-customauthorizer-name=authorizer" +
          "&x-amz-customauthorizer-signature=signature" +
          "&token=value-1",
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

  it("rejects with the cloud's status when it hands out no credentials", async () => {
    mock.credentialStatusCode = 401;

    await expect(open().connection).rejects.toMatchObject({
      httpStatusCode: 401,
    });
    expect(connectAsync).not.toHaveBeenCalled();
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
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("rejects with a DysonConnectionError for any other failure to connect", async () => {
    vi.mocked(connectAsync).mockRejectedValue(
      new Error("Couldn't connect to server"),
    );

    await expect(open().connection).rejects.toBeInstanceOf(
      DysonConnectionError,
    );
  });

  it("rejects with status 501 for a machine on the RabbitMQ broker, and asks for nothing", async () => {
    await expect(
      open({ ...MACHINE, remoteBrokerType: "rabbitMq" } as typeof MACHINE)
        .connection,
    ).rejects.toMatchObject({ httpStatusCode: 501 });

    expect(mock.credentialRequests).toHaveLength(0);
    expect(connectAsync).not.toHaveBeenCalled();
  });
});

import { connectAsync } from "mqtt";
import { describe, expect, it, vi } from "vitest";
import {
  Broker,
  COMMAND_TOPIC,
  MACHINE,
  useMockBroker,
} from "../../cloud/__tests__/mocks/broker.js";
import { ACCOUNT } from "../../cloud/__tests__/mocks/cloud.js";
import { DysonConnectionError, DysonError } from "../../error.js";
import { MachineLink, type MachineLinkOptions } from "../link.js";

vi.mock("mqtt", () => ({ connectAsync: vi.fn() }));

const mock = useMockBroker();

function link(
  options: Partial<Omit<MachineLinkOptions, "account" | "host">> = {},
): MachineLink {
  return new MachineLink(MACHINE, {
    account: ACCOUNT,
    topics: ["status/current"],
    ...options,
  });
}

async function connected(
  options: Partial<Omit<MachineLinkOptions, "account" | "host">> = {},
): Promise<MachineLink> {
  const machineLink = link(options);
  await machineLink.connect();
  return machineLink;
}

describe("MachineLink", () => {
  it("sends nothing until connect", () => {
    link();

    expect(mock.credentialRequests).toHaveLength(0);
    expect(connectAsync).not.toHaveBeenCalled();
  });

  it("receives from each topic it is given", async () => {
    await connected({ topics: ["status/current", "status/faults"] });

    expect(mock.broker.subscribed).toEqual([
      "438/S-1/status/current",
      "438/S-1/status/faults",
    ]);
  });

  it("connects once, for every call and a second connect", async () => {
    const machineLink = await connected();

    await Promise.all([machineLink.send("A"), machineLink.send("B")]);
    await machineLink.connect();

    expect(mock.credentialRequests).toHaveLength(1);
    expect(connectAsync).toHaveBeenCalledOnce();
  });

  it("rejects a call with status 503 before connect, and sends nothing", async () => {
    await expect(link().send("A")).rejects.toEqual(
      new DysonError("Not connected: call connect first", 503),
    );

    expect(connectAsync).not.toHaveBeenCalled();
  });

  it("sends a command to the machine's command topic, with its fields", async () => {
    await (await connected()).send("STATE-SET", { data: { fnsp: "0005" } });

    expect(mock.broker.published).toEqual([
      {
        topic: COMMAND_TOPIC,
        message: {
          msg: "STATE-SET",
          time: expect.stringMatching(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
          "mode-reason": "RAPP",
          data: { fnsp: "0005" },
        },
      },
    ]);
  });

  describe("at a host", () => {
    const machine = { ...MACHINE, apPasswordHash: "hash-1" };

    it("connects to the machine's own broker, and asks the cloud nothing", async () => {
      await new MachineLink(machine, {
        host: "S-1.local",
        topics: ["status/current"],
      }).connect();

      expect(connectAsync).toHaveBeenCalledExactlyOnceWith(
        "mqtt://S-1.local:1883",
        expect.objectContaining({
          clientId: expect.stringMatching(/^[0-9a-f]{16}$/),
          username: "S-1",
          password: "hash-1",
        }),
        false,
      );
      expect(mock.credentialRequests).toHaveLength(0);
      expect(mock.broker.subscribed).toEqual(["438/S-1/status/current"]);
    });

    it("sends a command with the mode reason of the LAN", async () => {
      const machineLink = new MachineLink(machine, {
        host: "S-1.local",
        topics: [],
      });
      await machineLink.connect();

      await machineLink.send("REQUEST-CURRENT-STATE");

      expect(mock.broker.published).toMatchObject([
        { topic: COMMAND_TOPIC, message: { "mode-reason": "LAPP" } },
      ]);
    });

    it("throws an Error for a machine without an apPasswordHash", () => {
      expect(
        () => new MachineLink(MACHINE, { host: "S-1.local", topics: [] }),
      ).toThrow(
        new Error(
          "A machine reached at a host needs the apPasswordHash that getMachines reads",
        ),
      );
    });
  });

  describe("at a host, with an account", () => {
    const machine = { ...MACHINE, apPasswordHash: "hash-1" };

    function fallingBack(): MachineLink {
      return new MachineLink(machine, {
        account: ACCOUNT,
        host: "S-1.local",
        topics: [],
      });
    }

    // The machine's own broker refuses each connection while `refused`.
    function refuseLan(): { refused: boolean } {
      const lan = { refused: true };
      const connect = vi.mocked(connectAsync).getMockImplementation();
      vi.mocked(connectAsync).mockImplementation((async (
        url: string,
        ...rest: unknown[]
      ) => {
        if (lan.refused && url.startsWith("mqtt://")) {
          throw Object.assign(new Error("connect ECONNREFUSED"), {
            code: "ECONNREFUSED",
          });
        }
        return (connect as (...args: unknown[]) => unknown)(url, ...rest);
      }) as typeof connectAsync);
      return lan;
    }

    function urls(): string[] {
      return vi.mocked(connectAsync).mock.calls.map(([url]) => String(url));
    }

    it("connects to the machine's own broker, and asks the cloud nothing", async () => {
      const machineLink = fallingBack();
      expect(machineLink.hostType).toBeNull();

      await machineLink.connect();

      expect(urls()).toEqual(["mqtt://S-1.local:1883"]);
      expect(mock.credentialRequests).toHaveLength(0);
      expect(machineLink.hostType).toBe("local");
    });

    it("connects through the cloud when the machine's own broker fails to open, with the mode reason of the cloud", async () => {
      refuseLan();
      const machineLink = fallingBack();
      await machineLink.connect();

      await machineLink.send("REQUEST-CURRENT-STATE");

      expect(urls()).toEqual([
        "mqtt://S-1.local:1883",
        "mqtts://broker.example.com:443",
      ]);
      expect(machineLink.hostType).toBe("remote");
      expect(mock.broker.published).toMatchObject([
        { message: { "mode-reason": "RAPP" } },
      ]);
    });

    it("tries the machine's own broker first again when the connection closes", async () => {
      const lan = refuseLan();
      const machineLink = fallingBack();
      await machineLink.connect();

      lan.refused = false;
      mock.broker.drop();
      expect(machineLink.hostType).toBeNull();
      await vi.waitFor(() => expect(urls()).toHaveLength(3));
      await vi.waitFor(() => expect(machineLink.hostType).toBe("local"));
      await machineLink.send("REQUEST-CURRENT-STATE");

      expect(urls()[2]).toBe("mqtt://S-1.local:1883");
      expect(mock.broker.published).toMatchObject([
        { message: { "mode-reason": "LAPP" } },
      ]);
    });

    it("rejects with the cloud's failure when neither broker opens", async () => {
      refuseLan();
      mock.credentialStatusCode = 401;

      await expect(fallingBack().connect()).rejects.toMatchObject({
        httpStatusCode: 401,
      });
    });
  });

  describe("request", () => {
    it("resolves with the next message that has the reply's msg", async () => {
      mock.broker.answers = {
        "REQUEST-CURRENT-STATE": [
          { msg: "STATE-CHANGE", "product-state": {} },
          { msg: "CURRENT-STATE", "product-state": { fpwr: "ON" } },
        ],
      };

      await expect(
        (await connected()).request("REQUEST-CURRENT-STATE", "CURRENT-STATE"),
      ).resolves.toEqual({
        msg: "CURRENT-STATE",
        "product-state": { fpwr: "ON" },
      });
    });

    it("rejects with status 504 when the machine does not answer in time", async () => {
      await expect(
        (await connected({ timeoutInMs: 20 })).request(
          "REQUEST-CURRENT-STATE",
          "CURRENT-STATE",
        ),
      ).rejects.toEqual(
        new DysonError("The machine sent no CURRENT-STATE in time", 504),
      );
    });

    it("asks again on a new connection when the connection closes under it", async () => {
      const machineLink = await connected();

      const reply = machineLink.request("A", "REPLY");
      await vi.waitFor(() => expect(mock.broker.published).toHaveLength(1));
      mock.broker.answers = { A: [{ msg: "REPLY" }] };
      mock.broker.drop();

      await expect(reply).resolves.toEqual({ msg: "REPLY" });
      expect(mock.credentialRequests).toHaveLength(2);
    });

    it("rejects with status 503 when the link is disconnected under it, and connects no more", async () => {
      const machineLink = await connected();

      const reply = machineLink.request("A", "REPLY");
      const rejection = expect(reply).rejects.toEqual(
        new DysonError("Not connected: call connect first", 503),
      );
      await vi.waitFor(() => expect(mock.broker.published).toHaveLength(1));
      await machineLink.disconnect();
      await rejection;

      expect(mock.credentialRequests).toHaveLength(1);
    });
  });

  describe("retry", () => {
    const refused = new Error("connect ECONNREFUSED");

    it("connects again after a connection the broker refuses", async () => {
      vi.mocked(connectAsync)
        .mockRejectedValueOnce(refused)
        .mockRejectedValueOnce(refused);

      await connected({ retry: { delaysInMs: [0, 0] } });

      expect(connectAsync).toHaveBeenCalledTimes(3);
      expect(mock.broker.subscribed).toHaveLength(1);
    });

    it("rejects with the DysonConnectionError of the last attempt", async () => {
      vi.mocked(connectAsync).mockRejectedValue(refused);

      await expect(
        connected({ retry: { delaysInMs: [0] } }),
      ).rejects.toBeInstanceOf(DysonConnectionError);

      expect(connectAsync).toHaveBeenCalledTimes(2);
    });

    it("connects once with no delays to retry after", async () => {
      vi.mocked(connectAsync).mockRejectedValue(refused);

      await expect(
        connected({ retry: { delaysInMs: [] } }),
      ).rejects.toBeInstanceOf(DysonConnectionError);

      expect(connectAsync).toHaveBeenCalledOnce();
    });
  });

  describe("when the connection closes", () => {
    it("connects again by itself, calls onReconnect and receives again", async () => {
      const onMessage = vi.fn();
      const onReconnect = vi.fn();
      const onDisconnect = vi.fn();
      await connected({ onMessage, onReconnect, onDisconnect });

      mock.broker.drop();
      await vi.waitFor(() => expect(onReconnect).toHaveBeenCalledOnce());
      mock.broker.send({ msg: "STATE-CHANGE" });

      expect(mock.credentialRequests).toHaveLength(2);
      expect(onMessage.mock.calls).toEqual([[{ msg: "STATE-CHANGE" }]]);
      expect(onDisconnect).not.toHaveBeenCalled();
    });

    it("takes a connection that closes sooner than it took to open as a failed attempt", async () => {
      const onReconnect = vi.fn();
      const onDisconnect = vi.fn();
      await connected({
        retry: { delaysInMs: [0, 0] },
        onReconnect,
        onDisconnect,
      });
      // Each connection from now takes 20 ms to open, and the broker closes
      // it 1 ms after.
      vi.mocked(connectAsync).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        const broker = new Broker();
        broker.subscribeAsync = async () => {
          setTimeout(() => broker.drop(), 1);
          return [{ qos: 1 }];
        };
        mock.broker = broker;
        return broker as unknown as Awaited<ReturnType<typeof connectAsync>>;
      });

      mock.broker.drop();
      await vi.waitFor(() => expect(onDisconnect).toHaveBeenCalledOnce());

      expect(onReconnect).not.toHaveBeenCalled();
      // The first connection, then one attempt and one for each delay.
      expect(mock.credentialRequests).toHaveLength(4);
    });

    it("calls onReconnect, not onDisconnect, when a call connected after the link's last attempt", async () => {
      const onReconnect = vi.fn();
      const onDisconnect = vi.fn();
      const machineLink = await connected({
        retry: { delaysInMs: [] },
        onReconnect,
        onDisconnect,
      });
      let dropped = false;
      // The link's one attempt takes 50 ms to open and the broker closes it
      // 1 ms after. The call's connection takes 5 ms and stays open.
      vi.mocked(connectAsync)
        .mockImplementationOnce(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          const broker = new Broker();
          broker.subscribeAsync = async () => {
            setTimeout(() => {
              broker.drop();
              dropped = true;
            }, 1);
            return [{ qos: 1 }];
          };
          return broker as unknown as Awaited<ReturnType<typeof connectAsync>>;
        })
        .mockImplementationOnce(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          mock.broker = new Broker();
          return mock.broker as unknown as Awaited<
            ReturnType<typeof connectAsync>
          >;
        });

      mock.broker.drop();
      await vi.waitFor(() => expect(dropped).toBe(true));
      await machineLink.send("A");
      await vi.waitFor(() => expect(onReconnect).toHaveBeenCalledOnce());

      expect(onDisconnect).not.toHaveBeenCalled();
      expect(mock.broker.commands()).toEqual(["A"]);
    });

    it("calls onDisconnect when it fails to connect again, and rejects calls until connect", async () => {
      const onReconnect = vi.fn();
      const onDisconnect = vi.fn();
      const machineLink = await connected({ onReconnect, onDisconnect });

      mock.credentialStatusCode = 401;
      mock.broker.drop();
      await vi.waitFor(() => expect(onDisconnect).toHaveBeenCalledOnce());
      mock.credentialStatusCode = 200;
      await expect(machineLink.send("A")).rejects.toMatchObject({
        httpStatusCode: 503,
      });
      await machineLink.connect();
      await machineLink.send("A");

      expect(onReconnect).not.toHaveBeenCalled();
      expect(mock.credentialRequests).toHaveLength(3);
    });
  });

  it("passes over a payload that is no message", async () => {
    const machineLink = await connected({ timeoutInMs: 20 });
    mock.broker.answers = { A: ["no message", { msg: "REPLY" }] };

    await expect(machineLink.request("A", "REPLY")).resolves.toEqual({
      msg: "REPLY",
    });
  });

  it("passes each message on to onMessage, the answer to a request included", async () => {
    const onMessage = vi.fn();
    const machineLink = await connected({ onMessage });
    mock.broker.answers = { A: [{ msg: "REPLY" }] };

    await machineLink.request("A", "REPLY");
    mock.broker.send({ msg: "STATE-CHANGE", "product-state": {} });

    expect(onMessage.mock.calls).toEqual([
      [{ msg: "REPLY" }],
      [{ msg: "STATE-CHANGE", "product-state": {} }],
    ]);
  });

  it("asks the cloud with its own user agent, or the one it is given", async () => {
    await connected();
    await connected({ userAgent: "my-app/1.0" });

    expect(
      mock.credentialRequests.map((each) => each.headers["User-Agent"]),
    ).toEqual(["dyson-control", "my-app/1.0"]);
  });

  it("asks for new credentials after a failure to get them", async () => {
    const machineLink = link();
    mock.credentialStatusCode = 401;

    await expect(machineLink.connect()).rejects.toMatchObject({
      httpStatusCode: 401,
    });
    mock.credentialStatusCode = 200;
    await machineLink.connect();

    expect(mock.credentialRequests).toHaveLength(2);
  });

  describe("disconnect", () => {
    it("closes the connection, and connect opens another", async () => {
      const machineLink = await connected();

      await machineLink.disconnect();
      expect(machineLink.hostType).toBeNull();
      await machineLink.connect();
      await machineLink.send("A");

      expect(mock.credentialRequests).toHaveLength(2);
      expect(machineLink.hostType).toBe("remote");
    });

    it("calls onDisconnect once it has disconnected, and connects no more by itself", async () => {
      const onReconnect = vi.fn();
      const onDisconnect = vi.fn();
      const machineLink = await connected({ onReconnect, onDisconnect });

      await machineLink.disconnect();
      expect(onDisconnect).toHaveBeenCalledOnce();
      await machineLink.disconnect();

      expect(onDisconnect).toHaveBeenCalledOnce();
      expect(onReconnect).not.toHaveBeenCalled();
      expect(mock.credentialRequests).toHaveLength(1);
    });

    it("calls onDisconnect once for a disconnect while it connects again, and nothing for the reconnect", async () => {
      const onReconnect = vi.fn();
      const onDisconnect = vi.fn();
      const machineLink = await connected({
        retry: { delaysInMs: [50] },
        onReconnect,
        onDisconnect,
      });
      vi.mocked(connectAsync).mockRejectedValueOnce(
        new Error("connect ECONNREFUSED"),
      );

      mock.broker.drop();
      await vi.waitFor(() => expect(connectAsync).toHaveBeenCalledTimes(2));
      await machineLink.disconnect();
      await machineLink.connect();
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(onDisconnect).toHaveBeenCalledOnce();
      expect(onReconnect).not.toHaveBeenCalled();
      await machineLink.send("A");
    });

    it("does nothing before connect", async () => {
      await link().disconnect();

      expect(connectAsync).not.toHaveBeenCalled();
    });
  });
});

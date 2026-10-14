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

function link(options: Partial<MachineLinkOptions> = {}): MachineLink {
  return new MachineLink(MACHINE, { account: ACCOUNT, ...options });
}

describe("MachineLink", () => {
  it("sends nothing until the first call", () => {
    link();

    expect(mock.credentialRequests).toHaveLength(0);
    expect(connectAsync).not.toHaveBeenCalled();
  });

  it("connects once for calls made at the same time, and for later ones", async () => {
    const machineLink = link();

    await Promise.all([machineLink.send("A"), machineLink.send("B")]);
    await machineLink.send("C");

    expect(mock.credentialRequests).toHaveLength(1);
    expect(connectAsync).toHaveBeenCalledOnce();
  });

  it("sends a command to the machine's command topic, with its fields", async () => {
    await link().send("STATE-SET", { data: { fnsp: "0005" } });

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

  describe("request", () => {
    it("resolves with the next message that has the reply's msg", async () => {
      mock.broker.answers = {
        "REQUEST-CURRENT-STATE": [
          { msg: "STATE-CHANGE", "product-state": {} },
          { msg: "CURRENT-STATE", "product-state": { fpwr: "ON" } },
        ],
      };

      await expect(
        link().request("REQUEST-CURRENT-STATE", "CURRENT-STATE"),
      ).resolves.toEqual({
        msg: "CURRENT-STATE",
        "product-state": { fpwr: "ON" },
      });
    });

    it("rejects with status 504 when the machine does not answer in time", async () => {
      await expect(
        link({ timeoutInMs: 20 }).request(
          "REQUEST-CURRENT-STATE",
          "CURRENT-STATE",
        ),
      ).rejects.toEqual(
        new DysonError("The machine sent no CURRENT-STATE in time", 504),
      );
    });

    it("asks again on a new connection when the connection closes under it", async () => {
      const machineLink = link();

      const reply = machineLink.request("A", "REPLY");
      await vi.waitFor(() => expect(mock.broker.published).toHaveLength(1));
      mock.broker.answers = { A: [{ msg: "REPLY" }] };
      mock.broker.drop();

      await expect(reply).resolves.toEqual({ msg: "REPLY" });
      expect(mock.credentialRequests).toHaveLength(2);
    });

    it("rejects with status 503 when the link is closed under it, and connects no more", async () => {
      const machineLink = link();

      const reply = machineLink.request("A", "REPLY");
      const rejection = expect(reply).rejects.toEqual(
        new DysonError("The link was closed", 503),
      );
      await vi.waitFor(() => expect(mock.broker.published).toHaveLength(1));
      await machineLink.close();
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

      await link({ retry: { delaysInMs: [0, 0] } }).send("A");

      expect(connectAsync).toHaveBeenCalledTimes(3);
      expect(mock.broker.commands()).toEqual(["A"]);
    });

    it("rejects with the DysonConnectionError of the last attempt", async () => {
      vi.mocked(connectAsync).mockRejectedValue(refused);

      await expect(
        link({ retry: { delaysInMs: [0] } }).send("A"),
      ).rejects.toBeInstanceOf(DysonConnectionError);

      expect(connectAsync).toHaveBeenCalledTimes(2);
    });

    it("connects once with no delays to retry after", async () => {
      vi.mocked(connectAsync).mockRejectedValue(refused);

      await expect(
        link({ retry: { delaysInMs: [] } }).send("A"),
      ).rejects.toBeInstanceOf(DysonConnectionError);

      expect(connectAsync).toHaveBeenCalledOnce();
    });
  });

  describe("when the connection closes", () => {
    it("connects again by itself, calls onReconnect and receives again", async () => {
      const onMessage = vi.fn();
      const onReconnect = vi.fn();
      const onClose = vi.fn();
      const machineLink = link({ onMessage, onReconnect, onClose });
      await machineLink.send("A");

      mock.broker.drop();
      await vi.waitFor(() => expect(onReconnect).toHaveBeenCalledOnce());
      mock.broker.send({ msg: "STATE-CHANGE" });

      expect(mock.credentialRequests).toHaveLength(2);
      expect(onMessage.mock.calls).toEqual([[{ msg: "STATE-CHANGE" }]]);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("takes a connection that closes sooner than it took to open as a failed attempt", async () => {
      const onReconnect = vi.fn();
      const onClose = vi.fn();
      const machineLink = link({
        retry: { delaysInMs: [0, 0] },
        onReconnect,
        onClose,
      });
      await machineLink.send("A");
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
      await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());

      expect(onReconnect).not.toHaveBeenCalled();
      // The first connection, then one attempt and one for each delay.
      expect(mock.credentialRequests).toHaveLength(4);
    });

    it("calls onClose when it fails to connect again, and connects on the next call", async () => {
      const onReconnect = vi.fn();
      const onClose = vi.fn();
      const machineLink = link({ onReconnect, onClose });
      await machineLink.send("A");

      mock.credentialStatusCode = 401;
      mock.broker.drop();
      await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
      mock.credentialStatusCode = 200;
      await machineLink.send("A");

      expect(onReconnect).not.toHaveBeenCalled();
      expect(mock.credentialRequests).toHaveLength(3);
    });
  });

  it("passes over a payload that is no message", async () => {
    const machineLink = link({ timeoutInMs: 20 });
    mock.broker.answers = { A: ["no message", { msg: "REPLY" }] };

    await expect(machineLink.request("A", "REPLY")).resolves.toEqual({
      msg: "REPLY",
    });
  });

  it("passes each message on to onMessage, the answer to a request included", async () => {
    const onMessage = vi.fn();
    const machineLink = link({ onMessage });
    mock.broker.answers = { A: [{ msg: "REPLY" }] };

    await machineLink.request("A", "REPLY");
    mock.broker.send({ msg: "STATE-CHANGE", "product-state": {} });

    expect(onMessage.mock.calls).toEqual([
      [{ msg: "REPLY" }],
      [{ msg: "STATE-CHANGE", "product-state": {} }],
    ]);
  });

  it("asks the cloud with its own user agent, or the one it is given", async () => {
    await link().send("A");
    await link({ userAgent: "my-app/1.0" }).send("A");

    expect(
      mock.credentialRequests.map((each) => each.headers["User-Agent"]),
    ).toEqual(["dyson-control", "my-app/1.0"]);
  });

  it("asks for new credentials after a failure to get them", async () => {
    const machineLink = link();
    mock.credentialStatusCode = 401;

    await expect(machineLink.send("A")).rejects.toMatchObject({
      httpStatusCode: 401,
    });
    mock.credentialStatusCode = 200;
    await machineLink.send("A");

    expect(mock.credentialRequests).toHaveLength(2);
  });

  describe("close", () => {
    it("closes the connection, and the next call opens another", async () => {
      const machineLink = link();
      await machineLink.send("A");

      await machineLink.close();
      await machineLink.send("A");

      expect(mock.credentialRequests).toHaveLength(2);
    });

    it("calls onClose, and connects no more by itself", async () => {
      const onReconnect = vi.fn();
      const onClose = vi.fn();
      const machineLink = link({ onReconnect, onClose });
      await machineLink.send("A");

      await machineLink.close();
      await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());

      expect(onReconnect).not.toHaveBeenCalled();
      expect(mock.credentialRequests).toHaveLength(1);
    });

    it("does nothing before the first call", async () => {
      await link().close();

      expect(connectAsync).not.toHaveBeenCalled();
    });
  });
});

import { connectAsync } from "mqtt";
import { describe, expect, it, vi } from "vitest";
import {
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

    it("rejects when the connection closes, and the next call connects again", async () => {
      const machineLink = link();

      const reply = machineLink.request(
        "REQUEST-CURRENT-STATE",
        "CURRENT-STATE",
      );
      const rejection =
        expect(reply).rejects.toBeInstanceOf(DysonConnectionError);
      await vi.waitFor(() => expect(mock.broker.published).toHaveLength(1));
      mock.broker.emit("close");
      await rejection;

      await machineLink.send("A");
      expect(mock.credentialRequests).toHaveLength(2);
    });
  });

  it("passes over a payload that is no message", async () => {
    const machineLink = link({ timeoutInMs: 20 });
    mock.broker.answers = { A: ["no message", { msg: "REPLY" }] };

    await expect(machineLink.request("A", "REPLY")).resolves.toEqual({
      msg: "REPLY",
    });
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

    it("does nothing before the first call", async () => {
      await link().close();

      expect(connectAsync).not.toHaveBeenCalled();
    });
  });
});

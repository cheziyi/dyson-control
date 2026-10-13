import { describe, expect, it } from "vitest";
import {
  buildMachineCommand,
  encodeMachineTopic,
  parseMachineMessage,
} from "../message.js";

const MACHINE = { type: "438", serialNumber: "A1B-EU-ABC1234D" };

describe("encodeMachineTopic", () => {
  it("starts with the root topic level the cloud names", () => {
    expect(
      encodeMachineTopic({ ...MACHINE, mqttRootTopicLevel: "438E" }, "command"),
    ).toBe("438E/A1B-EU-ABC1234D/command");
  });

  it("joins the type, the serial number and the topic", () => {
    expect(encodeMachineTopic(MACHINE, "command")).toBe(
      "438/A1B-EU-ABC1234D/command",
    );
    expect(encodeMachineTopic(MACHINE, "status")).toBe(
      "438/A1B-EU-ABC1234D/status/current",
    );
  });
});

describe("buildMachineCommand", () => {
  const time = new Date("2026-10-13T08:09:10.123Z");

  it("writes the time in whole seconds and the mode reason of the cloud", () => {
    expect(
      JSON.parse(buildMachineCommand("REQUEST-CURRENT-STATE", time)),
    ).toEqual({
      msg: "REQUEST-CURRENT-STATE",
      time: "2026-10-13T08:09:10Z",
      "mode-reason": "RAPP",
    });
  });

  it("writes the fields beside msg", () => {
    expect(
      JSON.parse(
        buildMachineCommand("STATE-SET", time, { data: { fnsp: "0005" } }),
      ),
    ).toEqual({
      msg: "STATE-SET",
      time: "2026-10-13T08:09:10Z",
      "mode-reason": "RAPP",
      data: { fnsp: "0005" },
    });
  });
});

describe("parseMachineMessage", () => {
  it("reads a message with its fields", () => {
    expect(
      parseMachineMessage('{"msg":"CURRENT-STATE","product-state":{}}'),
    ).toEqual({ msg: "CURRENT-STATE", "product-state": {} });
  });

  it.each([
    ["a payload that is no JSON", "not json"],
    ["a payload that is no object", "3"],
    ["an object without a msg", "{}"],
  ])("answers undefined for %s", (_name, payload) => {
    expect(parseMachineMessage(payload)).toBeUndefined();
  });
});

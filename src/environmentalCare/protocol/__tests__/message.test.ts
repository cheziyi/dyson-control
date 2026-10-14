import { describe, expect, it } from "vitest";
import {
  buildEnvironmentalCareStateSet,
  parseEnvironmentalCareMessage,
} from "../message.js";

describe("buildEnvironmentalCareStateSet", () => {
  it("carries the fields as data", () => {
    expect(buildEnvironmentalCareStateSet({ fnsp: "0005" })).toEqual({
      data: { fnsp: "0005" },
    });
  });
});

describe("parseEnvironmentalCareMessage", () => {
  it("reads the product-state of a CURRENT-STATE", () => {
    expect(
      parseEnvironmentalCareMessage({
        msg: "CURRENT-STATE",
        "product-state": { fpwr: "ON", fnsp: "0003" },
      }),
    ).toEqual({ name: "CURRENT-STATE", values: { fpwr: "ON", fnsp: "0003" } });
  });

  it("reads the new value of each field of a STATE-CHANGE", () => {
    expect(
      parseEnvironmentalCareMessage({
        msg: "STATE-CHANGE",
        "product-state": { fpwr: ["OFF", "ON"], fnsp: ["0003", "0003"] },
      }),
    ).toEqual({ name: "STATE-CHANGE", values: { fpwr: "ON", fnsp: "0003" } });
  });

  it("reads the data of a sensors message", () => {
    expect(
      parseEnvironmentalCareMessage({
        msg: "ENVIRONMENTAL-CURRENT-SENSOR-DATA",
        data: { tact: "2950", hact: "0055" },
      }),
    ).toEqual({
      name: "ENVIRONMENTAL-CURRENT-SENSOR-DATA",
      values: { tact: "2950", hact: "0055" },
    });
  });

  it.each([
    ["another message", { msg: "ANOTHER", "product-state": {} }],
    ["a state without fields", { msg: "CURRENT-STATE" }],
  ])("answers undefined for %s", (_name, message) => {
    expect(parseEnvironmentalCareMessage(message)).toBeUndefined();
  });
});

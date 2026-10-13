import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMMAND_TOPIC,
  MACHINE,
  useMockBroker,
} from "../../cloud/__tests__/mocks/broker.js";
import { ACCOUNT } from "../../cloud/__tests__/mocks/cloud.js";
import type { DysonMachine } from "../../cloud/models/machine.js";
import { EnvironmentalCareDysonClient } from "../client.js";

vi.mock("mqtt", () => ({ connectAsync: vi.fn() }));

const mock = useMockBroker();

const PRODUCT_STATE = { fpwr: "ON", auto: "OFF", fnsp: "0004", nmod: "OFF" };

// The machine answers each request with what it holds.
function answer(productState: Record<string, string> = PRODUCT_STATE): void {
  mock.broker.answers = {
    "REQUEST-CURRENT-STATE": [
      { msg: "CURRENT-STATE", "product-state": productState },
    ],
    "REQUEST-PRODUCT-ENVIRONMENT-CURRENT-SENSOR-DATA": [
      {
        msg: "ENVIRONMENTAL-CURRENT-SENSOR-DATA",
        data: { tact: "2952", hact: "0055" },
      },
    ],
  };
}

function client(machine: DysonMachine = MACHINE): EnvironmentalCareDysonClient {
  return new EnvironmentalCareDysonClient(machine, { account: ACCOUNT });
}

beforeEach(() => {
  answer();
});

describe("EnvironmentalCareDysonClient", () => {
  it("takes an environmental care machine, and a machine without a category", () => {
    expect(() =>
      client({ ...MACHINE, category: "environmentalCare" }),
    ).not.toThrow();
    expect(() => client({ ...MACHINE, category: "robot" })).toThrow(
      "An EnvironmentalCareDysonClient takes an environmental care machine, not one of category robot",
    );
  });

  it("throws for a type that is no known environmental care machine's", () => {
    expect(() => client({ ...MACHINE, type: "276" })).toThrow(
      "276 is no known type of environmental care machine",
    );
  });

  it("reads the state the machine answers a request with", async () => {
    await expect(client().getState()).resolves.toMatchObject({
      fanPower: true,
      autoMode: false,
      fanSpeed: 4,
      nightMode: false,
      heatMode: null,
    });
    expect(mock.broker.published).toMatchObject([
      { topic: COMMAND_TOPIC, message: { msg: "REQUEST-CURRENT-STATE" } },
    ]);
  });

  it("reads the sensors with one request", async () => {
    await expect(client().getSensors()).resolves.toMatchObject({
      temperatureInC: 22.05,
      humidityInPercent: 55,
    });
    expect(mock.broker.commands()).toEqual([
      "REQUEST-PRODUCT-ENVIRONMENT-CURRENT-SENSOR-DATA",
    ]);
  });

  it("reads the fields of the first generation by the machine's type", async () => {
    answer({ fmod: "AUTO", fnsp: "0003" });
    const purifier = client({ ...MACHINE, type: "475" });

    await expect(purifier.getState()).resolves.toMatchObject({
      fanPower: true,
      autoMode: true,
      fanSpeed: 3,
    });
    // 295.2 K, counted from 273 K.
    await expect(purifier.getSensors()).resolves.toMatchObject({
      temperatureInC: 22.2,
    });
  });

  it("rejects with status 502 for a state without fields", async () => {
    mock.broker.answers = {
      "REQUEST-CURRENT-STATE": [{ msg: "CURRENT-STATE" }],
    };

    await expect(client().getState()).rejects.toMatchObject({
      httpStatusCode: 502,
    });
  });

  describe("setState", () => {
    it("sends the fields the control sets in one command, without a read", async () => {
      await client().setState({ fanSpeed: 7, nightMode: true });

      expect(mock.broker.published).toMatchObject([
        {
          topic: COMMAND_TOPIC,
          message: {
            msg: "STATE-SET",
            data: { fpwr: "ON", auto: "OFF", fnsp: "0007", nmod: "ON" },
          },
        },
      ]);
    });

    it("writes the fields of the first generation by the machine's type", async () => {
      await client({ ...MACHINE, type: "475" }).setState({ autoMode: true });

      expect(mock.broker.published[0]?.message).toMatchObject({
        data: { fmod: "AUTO" },
      });
    });

    it("sends nothing for a control that sets nothing", async () => {
      await client().setState({});

      expect(mock.broker.published).toEqual([]);
    });
  });

  it("reads and writes the machine's own fields", async () => {
    const purifier = client();

    await expect(purifier.getProductState()).resolves.toEqual(PRODUCT_STATE);
    await purifier.setProductState({ ffoc: "ON" });

    expect(mock.broker.published[1]?.message).toMatchObject({
      msg: "STATE-SET",
      data: { ffoc: "ON" },
    });
  });

  it("closes the link", async () => {
    const purifier = client();
    await purifier.getState();

    await purifier.close();
    await purifier.getState();

    expect(mock.credentialRequests).toHaveLength(2);
  });
});

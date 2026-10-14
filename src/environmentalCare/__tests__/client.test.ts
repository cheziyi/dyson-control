import { connectAsync } from "mqtt";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMMAND_TOPIC,
  MACHINE,
  useMockBroker,
} from "../../cloud/__tests__/mocks/broker.js";
import { ACCOUNT } from "../../cloud/__tests__/mocks/cloud.js";
import type { DysonMachine } from "../../cloud/models/machine.js";
import {
  EnvironmentalCareClient,
  type EnvironmentalCareClientOptions,
} from "../client.js";

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

function client(
  machine: DysonMachine = MACHINE,
  options: Partial<EnvironmentalCareClientOptions> = {},
): EnvironmentalCareClient {
  return new EnvironmentalCareClient(machine, { account: ACCOUNT, ...options });
}

beforeEach(() => {
  answer();
});

describe("EnvironmentalCareClient", () => {
  it("takes an environmental care machine, and a machine without a category", () => {
    expect(() =>
      client({ ...MACHINE, category: "environmentalCare" }),
    ).not.toThrow();
    expect(() => client({ ...MACHINE, category: "robot" })).toThrow(
      "An EnvironmentalCareClient takes an environmental care machine, not one of category robot",
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

  describe("onState", () => {
    it("takes the state of a STATE-CHANGE, and of an answer to getState", async () => {
      const onState = vi.fn();
      const purifier = client(MACHINE, { onState });

      await purifier.getState();
      mock.broker.send({
        msg: "STATE-CHANGE",
        "product-state": { fpwr: ["ON", "OFF"], fnsp: ["0004", "0004"] },
      });

      expect(onState.mock.calls).toMatchObject([
        [{ fanPower: true, fanSpeed: 4 }],
        [{ fanPower: false, fanSpeed: 4 }],
      ]);
    });

    it("takes nothing before the first call", () => {
      const onState = vi.fn();
      client(MACHINE, { onState });

      mock.broker.send({
        msg: "CURRENT-STATE",
        "product-state": PRODUCT_STATE,
      });

      expect(onState).not.toHaveBeenCalled();
    });
  });

  it("passes the readings the machine sends on to onSensors", async () => {
    const onState = vi.fn();
    const onSensors = vi.fn();
    const purifier = client(MACHINE, { onState, onSensors });
    await purifier.getSensors();

    mock.broker.send({
      msg: "ENVIRONMENTAL-CURRENT-SENSOR-DATA",
      data: { tact: "2962", hact: "0060" },
    });
    mock.broker.send({ msg: "ANOTHER", data: { tact: "2972" } });

    expect(onSensors.mock.calls).toMatchObject([
      [{ temperatureInC: 22.05, humidityInPercent: 55 }],
      [{ temperatureInC: 23.05, humidityInPercent: 60 }],
    ]);
    expect(onState).not.toHaveBeenCalled();
  });

  it("calls onReconnect once it connected again by itself, and onClose for a close", async () => {
    const onReconnect = vi.fn();
    const onClose = vi.fn();
    const purifier = client(MACHINE, { onReconnect, onClose });
    await purifier.getState();

    mock.broker.drop();
    await vi.waitFor(() => expect(onReconnect).toHaveBeenCalledOnce());
    expect(onClose).not.toHaveBeenCalled();

    await purifier.close();
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("asks again after a connection the broker refuses, by the delays it is given", async () => {
    vi.mocked(connectAsync).mockRejectedValue(
      new Error("connect ECONNREFUSED"),
    );

    await expect(
      client(MACHINE, { retry: { delaysInMs: [0] } }).getState(),
    ).rejects.toMatchObject({ httpStatusCode: 503 });

    expect(connectAsync).toHaveBeenCalledTimes(2);
  });

  it("passes the user agent it is given on to the cloud", async () => {
    const purifier = new EnvironmentalCareClient(MACHINE, {
      account: ACCOUNT,
      userAgent: "my-app/1.0",
    });

    await purifier.getState();

    expect(mock.credentialRequests[0]?.headers).toMatchObject({
      "User-Agent": "my-app/1.0",
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

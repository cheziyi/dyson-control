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

async function connected(
  machine: DysonMachine = MACHINE,
  options: Partial<EnvironmentalCareClientOptions> = {},
): Promise<EnvironmentalCareClient> {
  const purifier = client(machine, options);
  await purifier.connect();
  return purifier;
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

  it("reads what the machine carries from its type, variant and firmware capabilities, without connecting", () => {
    expect(
      client({
        ...MACHINE,
        type: "438",
        variant: "M",
        firmwareCapabilities: ["AdvanceOscillationDay1"],
      }).capabilities,
    ).toMatchObject({
      fanAirDirections: [],
      oscillation: "advanced",
      oscillationAngles: true,
    });
    expect(mock.broker.published).toEqual([]);
  });

  it("reads the state the machine answers a request with", async () => {
    await expect((await connected()).getState()).resolves.toMatchObject({
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
    await expect((await connected()).getSensors()).resolves.toMatchObject({
      temperatureInC: 22.05,
      humidityInPercent: 55,
    });
    expect(mock.broker.commands()).toEqual([
      "REQUEST-PRODUCT-ENVIRONMENT-CURRENT-SENSOR-DATA",
    ]);
  });

  it("reads the fields of the first generation by the machine's type", async () => {
    answer({ fmod: "AUTO", fnsp: "0003" });
    const purifier = await connected({ ...MACHINE, type: "475" });

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

    await expect((await connected()).getState()).rejects.toMatchObject({
      httpStatusCode: 502,
    });
  });

  describe("setState", () => {
    it("sends the fields the control sets in one command, without a read", async () => {
      await (await connected()).setState({ fanSpeed: 7, nightMode: true });

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
      await (await connected({ ...MACHINE, type: "475" })).setState({
        autoMode: true,
      });

      expect(mock.broker.published[0]?.message).toMatchObject({
        data: { fmod: "AUTO" },
      });
    });

    it("sends nothing for a control that sets nothing", async () => {
      await (await connected()).setState({});

      expect(mock.broker.published).toEqual([]);
    });
  });

  it("reads and writes the machine's own fields", async () => {
    const purifier = await connected();

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
      const purifier = await connected(MACHINE, { onState });

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

    it("takes what the machine sends from connect, which asks it nothing", async () => {
      const onState = vi.fn();
      await connected(MACHINE, { onState });

      mock.broker.send({
        msg: "CURRENT-STATE",
        "product-state": PRODUCT_STATE,
      });

      expect(mock.broker.published).toEqual([]);
      expect(onState).toHaveBeenCalledOnce();
    });
  });

  it("passes the readings the machine sends on to onSensors", async () => {
    const onState = vi.fn();
    const onSensors = vi.fn();
    const purifier = await connected(MACHINE, { onState, onSensors });
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

  it("passes the sleep timer of a first-generation machine on with its readings", async () => {
    const onState = vi.fn();
    const onSensors = vi.fn();
    await connected({ ...MACHINE, type: "455" }, { onState, onSensors });

    mock.broker.send({
      msg: "ENVIRONMENTAL-CURRENT-SENSOR-DATA",
      data: { tact: "2952", sltm: "0030" },
    });

    expect(onSensors.mock.calls).toMatchObject([
      [{ temperatureInC: 22.2, sleepTimerInMinutes: 30 }],
    ]);
    expect(onState).not.toHaveBeenCalled();
  });

  it("calls onReconnect once it connected again by itself, and onDisconnect for a disconnect", async () => {
    const onReconnect = vi.fn();
    const onDisconnect = vi.fn();
    const purifier = await connected(MACHINE, { onReconnect, onDisconnect });

    mock.broker.drop();
    await vi.waitFor(() => expect(onReconnect).toHaveBeenCalledOnce());
    expect(onDisconnect).not.toHaveBeenCalled();

    await purifier.disconnect();
    await vi.waitFor(() => expect(onDisconnect).toHaveBeenCalledOnce());
  });

  it("asks again after a connection the broker refuses, by the delays it is given", async () => {
    vi.mocked(connectAsync).mockRejectedValue(
      new Error("connect ECONNREFUSED"),
    );

    await expect(
      connected(MACHINE, { retry: { delaysInMs: [0] } }),
    ).rejects.toMatchObject({ httpStatusCode: 503 });

    expect(connectAsync).toHaveBeenCalledTimes(2);
  });

  it("passes the user agent it is given on to the cloud", async () => {
    await connected(MACHINE, { userAgent: "my-app/1.0" });

    expect(mock.credentialRequests[0]?.headers).toMatchObject({
      "User-Agent": "my-app/1.0",
    });
  });

  it("rejects a call with status 503 before connect and after close", async () => {
    const purifier = client();
    await expect(purifier.getState()).rejects.toMatchObject({
      httpStatusCode: 503,
    });

    await purifier.connect();
    await purifier.disconnect();

    await expect(purifier.setState({ nightMode: true })).rejects.toMatchObject({
      httpStatusCode: 503,
    });
    expect(mock.broker.published).toEqual([]);
  });
});

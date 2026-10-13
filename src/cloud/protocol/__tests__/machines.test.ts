import { describe, expect, it } from "vitest";
import { parseMachines } from "../machines.js";

const PURIFIER = {
  serialNumber: "A1B-EU-ABC1234D",
  name: "Bedroom",
  type: "438",
  variant: "E",
  model: "TP07",
  productName: "Purifier",
  category: "ec",
  connectionCategory: "lecAndWifi",
  connectedConfiguration: {
    mqtt: {
      remoteBrokerType: "wss",
      localBrokerCredentials: "ignored",
      mqttRootTopicLevel: "438E",
    },
    firmware: {
      version: "438MPF.00.01.007.0002",
      autoUpdateEnabled: true,
      newVersionAvailable: false,
    },
  },
};

describe("parseMachines", () => {
  it("reads a machine", () => {
    expect(parseMachines(JSON.stringify([PURIFIER]))).toEqual([
      {
        serialNumber: "A1B-EU-ABC1234D",
        type: "438",
        mqttRootTopicLevel: "438E",
        category: "environmentalCare",
        name: "Bedroom",
        variant: "E",
        model: "TP07",
        productName: "Purifier",
        firmwareVersion: "438MPF.00.01.007.0002",
        remoteBrokerType: "awsIot",
      },
    ]);
  });

  it("leaves out a root topic level the cloud names none for", () => {
    const [machine] = parseMachines(
      JSON.stringify([
        {
          serialNumber: "S-1",
          type: "475",
          category: "ec",
          connectedConfiguration: { mqtt: { remoteBrokerType: "mqtts" } },
        },
      ]),
    );
    expect(machine).toEqual({
      serialNumber: "S-1",
      type: "475",
      category: "environmentalCare",
      remoteBrokerType: "rabbitMq",
    });
  });

  it.each([
    ["ec", "environmentalCare"],
    ["robot", "robot"],
    ["light", "lighting"],
    ["wearable", "wearableEnvironmentalCare"],
    ["hc", "hairCare"],
    ["flrc", "floorCare"],
    ["formulation", "formulation"],
    ["oc", "oralCare"],
    ["kc", undefined],
  ])("reads a category of %s as %s", (code, category) => {
    const [machine] = parseMachines(
      JSON.stringify([{ ...PURIFIER, category: code }]),
    );
    expect(machine?.category).toBe(category);
  });

  it("leaves out a machine without an MQTT configuration, a serial number or a type", () => {
    expect(
      parseMachines(
        JSON.stringify([
          { ...PURIFIER, connectedConfiguration: undefined },
          { ...PURIFIER, connectedConfiguration: { firmware: {} } },
          { ...PURIFIER, serialNumber: undefined },
          { ...PURIFIER, type: undefined },
          "not a machine",
        ]),
      ),
    ).toEqual([]);
  });

  it.each(["not json", "{}"])("throws status 502 for %s", (text) => {
    expect(() => parseMachines(text)).toThrow(
      expect.objectContaining({ httpStatusCode: 502 }),
    );
  });
});

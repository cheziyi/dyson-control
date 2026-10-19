import { describe, expect, it } from "vitest";
import type { DysonMachine } from "../../../cloud/models/machine.js";
import { decodeEnvironmentalCareCapabilities } from "../capabilities.js";
import { decodeEnvironmentalCareType } from "../type.js";

function decode(machine: Omit<DysonMachine, "serialNumber">) {
  const type = decodeEnvironmentalCareType(machine.type);
  if (type === undefined) {
    throw new Error(`${machine.type} is no known type`);
  }
  return decodeEnvironmentalCareCapabilities(
    { serialNumber: "S-1", ...machine },
    type,
  );
}

const DAY_0 = ["AdvanceOscillationDay0"];
const DAY_1 = ["AdvanceOscillationDay1"];

describe("decodeEnvironmentalCareCapabilities", () => {
  it("reads a later purifier whose firmware takes two angles", () => {
    expect(decode({ type: "438", firmwareCapabilities: DAY_1 })).toEqual({
      autoMode: true,
      continuousMonitoring: true,
      heatModes: [],
      fanAirDirections: ["forward", "backward"],
      humidificationModes: [],
      autoHumidification: false,
      oscillation: "advanced",
      oscillationAngles: { lowerInDegrees: 5, upperInDegrees: 355 },
      oscillationAngleWidthsInDegrees: [0, 45, 90, 180, 350],
      oscillationPresetAnglesInDegrees: [],
      hasAirQualitySensor: true,
    });
  });

  it("reads preset angles alone from a firmware that takes no two angles", () => {
    expect(decode({ type: "438", firmwareCapabilities: DAY_0 })).toMatchObject({
      oscillation: "advanced",
      oscillationAngles: null,
      oscillationPresetAnglesInDegrees: [45, 90, 180, 350],
    });
    expect(decode({ type: "635", firmwareCapabilities: DAY_0 })).toMatchObject({
      oscillationPresetAnglesInDegrees: [15, 40, 70],
    });
  });

  it("reads one direction alone, in a narrower range, for a 635 or a 739", () => {
    expect(decode({ type: "739", firmwareCapabilities: DAY_1 })).toMatchObject({
      oscillation: "advanced",
      oscillationAngles: { lowerInDegrees: 145, upperInDegrees: 215 },
      oscillationAngleWidthsInDegrees: [0],
      oscillationPresetAnglesInDegrees: [],
    });
  });

  it("reads an on-and-off oscillation alone from a firmware that gives no angles", () => {
    for (const firmwareCapabilities of [undefined, ["Scheduling"]]) {
      expect(decode({ type: "438", firmwareCapabilities })).toMatchObject({
        oscillation: "basic",
        oscillationAngles: null,
        oscillationPresetAnglesInDegrees: [],
      });
    }
  });

  it("takes no fan air direction from a variant without one", () => {
    expect(decode({ type: "527", variant: "K" })).toMatchObject({
      fanAirDirections: ["forward", "backward"],
    });
    expect(decode({ type: "527", variant: "M" })).toMatchObject({
      fanAirDirections: [],
    });
  });

  it("reads a barrel humidifier that humidifies by hand and by itself, whatever its firmware", () => {
    expect(decode({ type: "358", firmwareCapabilities: DAY_1 })).toEqual({
      autoMode: true,
      continuousMonitoring: true,
      heatModes: [],
      fanAirDirections: ["forward", "backward"],
      humidificationModes: ["off", "humidify"],
      autoHumidification: true,
      oscillation: "barrel",
      oscillationAngles: null,
      oscillationAngleWidthsInDegrees: [],
      oscillationPresetAnglesInDegrees: [45, 90, "breeze"],
      hasAirQualitySensor: true,
    });
  });

  it("reads no oscillation for a 965, which humidifies by hand alone", () => {
    for (const firmwareCapabilities of [undefined, DAY_1]) {
      expect(decode({ type: "965", firmwareCapabilities })).toMatchObject({
        humidificationModes: ["off", "humidify"],
        autoHumidification: false,
        oscillation: "none",
      });
    }
  });

  it("reads a tilt oscillation, whatever the firmware", () => {
    expect(decode({ type: "664", firmwareCapabilities: DAY_1 })).toMatchObject({
      oscillation: "tilt",
      oscillationAngles: null,
    });
  });

  it("reads no oscillation for an 897 whose firmware gives no angles", () => {
    expect(decode({ type: "897" })).toMatchObject({ oscillation: "none" });
    expect(decode({ type: "897", firmwareCapabilities: DAY_1 })).toMatchObject({
      oscillation: "advanced",
    });
  });

  it("reads no oscillation for a 997 whose firmware gives angles, since it takes none", () => {
    expect(decode({ type: "997", firmwareCapabilities: DAY_1 })).toMatchObject({
      oscillation: "none",
      oscillationAngles: null,
    });
    expect(decode({ type: "997" })).toMatchObject({ oscillation: "basic" });
  });

  it("reads an on-and-off oscillation for the first generation, whatever its firmware", () => {
    expect(decode({ type: "455", firmwareCapabilities: DAY_1 })).toMatchObject({
      oscillation: "basic",
      oscillationAngles: null,
    });
  });

  it("reads heat for the types that heat, and none for a 455C", () => {
    expect(decode({ type: "527" })).toMatchObject({
      heatModes: ["off", "heat"],
    });
    expect(decode({ type: "455C" })).toMatchObject({ heatModes: [] });
  });

  it("reads no auto mode for the types without one", () => {
    expect(decode({ type: "635" })).toMatchObject({
      autoMode: false,
      heatModes: ["off", "heat"],
    });
  });

  it("reads no continuous monitoring and no air quality sensor for the types without a sensor", () => {
    expect(decode({ type: "739" })).toMatchObject({
      continuousMonitoring: false,
      hasAirQualitySensor: false,
    });
  });
});

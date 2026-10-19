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
      oscillationModes: ["off", "on", "idleOff", "idleOn"],
      oscillationAngles: { lowerInDegrees: 5, upperInDegrees: 355 },
      oscillationAngleWidthsInDegrees: [0, 45, 90, 180, 350],
      oscillationPresetAnglesInDegrees: [],
      tiltAnglesInDegrees: [],
      findAndFollowModes: [],
      waterHardnesses: [],
      childLockMode: false,
      temperatureUnits: ["celsius", "fahrenheit"],
      nozzleAngles: [],
      focusDiffuses: [],
      airQualityTargets: [],
      wickDryingMode: false,
      wickDryingSpeeds: [],
      uvMode: false,
      ionisationMode: false,
      hasAirQualitySensor: true,
      filters: ["innerFilter", "outerFilter"],
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
        oscillationModes: ["off", "on"],
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
      oscillationModes: ["off", "on", "idleOff", "idleOn"],
      oscillationAngles: null,
      oscillationAngleWidthsInDegrees: [],
      oscillationPresetAnglesInDegrees: [45, 90, "breeze"],
      tiltAnglesInDegrees: [],
      findAndFollowModes: [],
      waterHardnesses: ["soft", "medium", "hard"],
      childLockMode: false,
      temperatureUnits: ["celsius", "fahrenheit"],
      nozzleAngles: [],
      focusDiffuses: [],
      airQualityTargets: [],
      wickDryingMode: false,
      wickDryingSpeeds: [],
      uvMode: false,
      ionisationMode: false,
      hasAirQualitySensor: true,
      filters: ["innerFilter", "outerFilter"],
    });
  });

  it("reads no oscillation and no filter life for a 965, which humidifies by hand alone", () => {
    for (const firmwareCapabilities of [undefined, DAY_1]) {
      expect(decode({ type: "965", firmwareCapabilities })).toMatchObject({
        humidificationModes: ["off", "humidify"],
        autoHumidification: false,
        oscillation: "none",
        oscillationModes: [],
        waterHardnesses: ["soft", "medium", "hard"],
        filters: [],
      });
    }
  });

  it("reads a tilt oscillation, whatever the firmware", () => {
    expect(decode({ type: "664", firmwareCapabilities: DAY_1 })).toMatchObject({
      oscillation: "tilt",
      oscillationModes: [],
      oscillationAngles: null,
      tiltAnglesInDegrees: [0, 25, 50, "breeze"],
    });
  });

  it("reads a child lock and wick drying for a 965", () => {
    expect(decode({ type: "965" })).toMatchObject({
      childLockMode: true,
      wickDryingMode: true,
      wickDryingSpeeds: ["slow", "normal", "fast"],
    });
  });

  it("reads a nozzle angle for an 831", () => {
    expect(decode({ type: "831" })).toMatchObject({
      nozzleAngles: ["direct", "indirect"],
    });
  });

  it("reads focus and diffuse and an air quality target for a 455", () => {
    expect(decode({ type: "455" })).toMatchObject({
      focusDiffuses: ["focus", "diffuse"],
      airQualityTargets: ["good", "sensitive", "verySensitive"],
      temperatureUnits: [],
    });
    expect(decode({ type: "475" })).toMatchObject({ focusDiffuses: [] });
  });

  it("reads no temperature unit for the types and the variant without one", () => {
    expect(decode({ type: "897" })).toMatchObject({ temperatureUnits: [] });
    expect(decode({ type: "438", variant: "M" })).toMatchObject({
      temperatureUnits: [],
    });
  });

  it.each([
    ["an 831 of model BP10-BA", { type: "831", model: "BP10-BA" }, true, true],
    [
      "an 831 of another model",
      { type: "831", model: "BP04-BA" },
      false,
      false,
    ],
    ["a 438 of model BP10-BA", { type: "438", model: "BP10-BA" }, false, false],
    ["a 917 of model EAST", { type: "917", model: "EAST" }, true, true],
    ["a 917 of another model", { type: "917", model: "TP11-BA" }, false, false],
    ["a 994 of model MP01-BA", { type: "994", model: "MP01-BA" }, true, true],
    ["a 997 of model EAST", { type: "997", model: "EAST" }, true, true],
    ["a 997 of another model", { type: "997", model: "PH04-BA" }, true, false],
    ["a 997 without a model", { type: "997" }, true, false],
  ])(
    "reads UV and ionisation for %s",
    (_name, machine, uvMode, ionisationMode) => {
      expect(decode(machine)).toMatchObject({ uvMode, ionisationMode });
    },
  );

  it("reads find and follow from the variants that have it", () => {
    expect(decode({ type: "438", variant: "N" })).toMatchObject({
      findAndFollowModes: ["off", "on", "scan"],
    });
    expect(decode({ type: "527", variant: "N" })).toMatchObject({
      findAndFollowModes: ["off", "on", "scan"],
    });
    expect(decode({ type: "438", variant: "M" })).toMatchObject({
      findAndFollowModes: [],
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

  it("reads an on-and-off oscillation and one filter for the first generation, whatever its firmware", () => {
    expect(decode({ type: "455", firmwareCapabilities: DAY_1 })).toMatchObject({
      oscillation: "basic",
      oscillationAngles: null,
      filters: ["filter"],
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

  it("reads no continuous monitoring, no air quality sensor and no filter life for the types without a sensor", () => {
    expect(decode({ type: "739" })).toMatchObject({
      continuousMonitoring: false,
      hasAirQualitySensor: false,
      filters: [],
    });
  });
});

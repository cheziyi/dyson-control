import { describe, expect, it } from "vitest";
import { parseEnvironmentalCareCapabilities } from "../capabilities.js";

describe("parseEnvironmentalCareCapabilities", () => {
  it("reads a later machine that carries every control it can", () => {
    expect(
      parseEnvironmentalCareCapabilities({
        serialNumber: "S-1",
        type: "438",
        capabilities: ["AdvanceOscillationDay1"],
      }),
    ).toEqual({
      autoMode: true,
      continuousMonitoring: true,
      heatModes: [],
      fanAirDirections: ["forward", "backward"],
      humidificationModes: [],
      autoHumidification: false,
      oscillation: "advanced",
      airQualitySensor: true,
    });
  });

  it("takes no oscillation with settable angles for a machine whose capabilities report none", () => {
    expect(
      parseEnvironmentalCareCapabilities({ serialNumber: "S-1", type: "438" }),
    ).toMatchObject({ oscillation: "basic" });
    expect(
      parseEnvironmentalCareCapabilities({
        serialNumber: "S-1",
        type: "438",
        capabilities: ["Scheduling"],
      }),
    ).toMatchObject({ oscillation: "basic" });
    expect(
      parseEnvironmentalCareCapabilities({
        serialNumber: "S-1",
        type: "438",
        capabilities: ["AdvanceOscillationDay0"],
      }),
    ).toMatchObject({ oscillation: "advanced" });
  });

  it("leaves no fan air direction to a variant that joins to an excluded name", () => {
    expect(
      parseEnvironmentalCareCapabilities({
        serialNumber: "S-1",
        type: "527",
        variant: "K",
      }),
    ).toMatchObject({ fanAirDirections: ["forward", "backward"] });
    expect(
      parseEnvironmentalCareCapabilities({
        serialNumber: "S-1",
        type: "527",
        variant: "M",
      }),
    ).toMatchObject({ fanAirDirections: [] });
  });

  it("reads a barrel machine that humidifies by hand and by itself", () => {
    expect(
      parseEnvironmentalCareCapabilities({ serialNumber: "S-1", type: "358" }),
    ).toEqual({
      autoMode: true,
      continuousMonitoring: true,
      heatModes: [],
      fanAirDirections: ["forward", "backward"],
      humidificationModes: ["off", "humidify"],
      autoHumidification: true,
      oscillation: "barrel",
      airQualitySensor: true,
    });
  });

  it("leaves no oscillation to a 965, which humidifies by hand alone", () => {
    expect(
      parseEnvironmentalCareCapabilities({ serialNumber: "S-1", type: "965" }),
    ).toMatchObject({
      humidificationModes: ["off", "humidify"],
      autoHumidification: false,
      oscillation: "none",
    });
  });

  it("reads a tilt machine, which carries no other oscillation", () => {
    expect(
      parseEnvironmentalCareCapabilities({
        serialNumber: "S-1",
        type: "664",
        capabilities: ["AdvanceOscillationDay1"],
      }),
    ).toMatchObject({ oscillation: "tilt" });
  });

  it("leaves no oscillation at all to an 897 whose capabilities report none, and advanced ones to one whose do", () => {
    expect(
      parseEnvironmentalCareCapabilities({ serialNumber: "S-1", type: "897" }),
    ).toMatchObject({ oscillation: "none" });
    expect(
      parseEnvironmentalCareCapabilities({
        serialNumber: "S-1",
        type: "897",
        capabilities: ["AdvanceOscillationDay0"],
      }),
    ).toMatchObject({ oscillation: "advanced" });
  });

  it("leaves no oscillation to a 997 whose capabilities report the advanced ones, and a plain one to a 997 whose do not", () => {
    expect(
      parseEnvironmentalCareCapabilities({
        serialNumber: "S-1",
        type: "997",
        capabilities: ["AdvanceOscillationDay1"],
      }),
    ).toMatchObject({ oscillation: "none" });
    expect(
      parseEnvironmentalCareCapabilities({ serialNumber: "S-1", type: "997" }),
    ).toMatchObject({ oscillation: "basic" });
  });

  it("reads heat for the types that heat, and none for a 455C", () => {
    expect(
      parseEnvironmentalCareCapabilities({ serialNumber: "S-1", type: "527" }),
    ).toMatchObject({ heatModes: ["off", "heat"] });
    expect(
      parseEnvironmentalCareCapabilities({ serialNumber: "S-1", type: "455C" }),
    ).toMatchObject({ heatModes: [], oscillation: "basic" });
  });

  it("reads no auto mode for the types without one", () => {
    expect(
      parseEnvironmentalCareCapabilities({ serialNumber: "S-1", type: "635" }),
    ).toMatchObject({ autoMode: false, heatModes: ["off", "heat"] });
  });

  it("reads no air and no monitoring for the types without a sensor", () => {
    expect(
      parseEnvironmentalCareCapabilities({ serialNumber: "S-1", type: "739" }),
    ).toMatchObject({
      continuousMonitoring: false,
      airQualitySensor: false,
      autoMode: false,
    });
  });

  it("resolves with undefined for a type that is no environmental care machine's", () => {
    expect(
      parseEnvironmentalCareCapabilities({ serialNumber: "S-1", type: "276" }),
    ).toBeUndefined();
    expect(
      parseEnvironmentalCareCapabilities({ serialNumber: "S-1", type: "999" }),
    ).toBeUndefined();
  });
});

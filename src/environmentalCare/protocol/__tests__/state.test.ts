import { describe, expect, it } from "vitest";
import type {
  EnvironmentalCareSensors,
  EnvironmentalCareState,
} from "../../models/state.js";
import {
  applyEnvironmentalCareControl,
  parseEnvironmentalCareSensors,
  parseEnvironmentalCareState,
} from "../state.js";

const LATER = { generation1: false, hasAutoMode: true };
const WITHOUT_AUTO_MODE = { generation1: false, hasAutoMode: false };
const GENERATION_1 = { generation1: true, hasAutoMode: true };

// A purifier with a heater: every field but the humidifier's.
const PURIFIER = {
  fpwr: "ON",
  auto: "OFF",
  fnsp: "0004",
  oson: "ON",
  osal: "0045",
  osau: "0315",
  ancp: "CUST",
  nmod: "OFF",
  rhtm: "ON",
  sltm: "OFF",
  fdir: "ON",
  hmod: "HEAT",
  hmax: "2952",
};

const NOTHING_REPORTED: EnvironmentalCareState = {
  fanPower: false,
  autoMode: null,
  fanSpeed: null,
  oscillationMode: null,
  oscillationAngles: null,
  nightMode: null,
  continuousMonitoring: null,
  sleepTimerInMinutes: null,
  fanAirDirection: null,
  heatMode: null,
  targetTemperatureInC: null,
  humidificationMode: null,
  autoHumidification: null,
  manualHumidificationTargetInPercent: null,
};

describe("parseEnvironmentalCareState", () => {
  it("reads every field a purifier with a heater reports", () => {
    expect(parseEnvironmentalCareState(PURIFIER, LATER)).toEqual({
      ...NOTHING_REPORTED,
      fanPower: true,
      autoMode: false,
      fanSpeed: 4,
      oscillationMode: "on",
      oscillationAngles: { lowerInDegrees: 45, upperInDegrees: 315 },
      nightMode: false,
      continuousMonitoring: true,
      sleepTimerInMinutes: "off",
      fanAirDirection: "forward",
      heatMode: "heat",
      targetTemperatureInC: 22.05,
    });
  });

  it("reads the humidifier's fields", () => {
    expect(
      parseEnvironmentalCareState(
        { fpwr: "ON", hume: "HUMD", haut: "OFF", humt: "0050" },
        LATER,
      ),
    ).toMatchObject({
      humidificationMode: "humidify",
      autoHumidification: false,
      manualHumidificationTargetInPercent: 50,
    });
  });

  it("reads a field the machine does not report as null", () => {
    expect(parseEnvironmentalCareState({ fpwr: "OFF" }, LATER)).toEqual(
      NOTHING_REPORTED,
    );
  });

  it.each([
    ["a speed", "0010", 10],
    ["AUTO", "AUTO", null],
    ["a speed outside 1 to 10", "0000", null],
  ])("reads a fan speed of %s", (_name, fnsp, fanSpeed) => {
    expect(
      parseEnvironmentalCareState({ fpwr: "ON", fnsp }, LATER).fanSpeed,
    ).toBe(fanSpeed);
  });

  it("reads the auto mode beside the fan speed", () => {
    expect(
      parseEnvironmentalCareState(
        { fpwr: "ON", auto: "ON", fnsp: "0004" },
        LATER,
      ),
    ).toMatchObject({ autoMode: true, fanSpeed: 4 });
  });

  it.each([
    ["OFF", "off"],
    ["ON", "on"],
    ["OIOF", "idleOff"],
    ["OION", "idleOn"],
    ["SCAN", "scan"],
    ["INIT", null],
  ])("reads an oscillation mode of %s", (oson, oscillationMode) => {
    expect(
      parseEnvironmentalCareState({ fpwr: "ON", oson }, LATER).oscillationMode,
    ).toBe(oscillationMode);
  });

  it("reads each mode that is off", () => {
    expect(
      parseEnvironmentalCareState(
        { fpwr: "ON", fdir: "OFF", hmod: "OFF", hume: "OFF" },
        LATER,
      ),
    ).toMatchObject({
      fanAirDirection: "backward",
      heatMode: "off",
      humidificationMode: "off",
    });
  });

  it("reads the minutes left on the sleep timer", () => {
    expect(
      parseEnvironmentalCareState({ fpwr: "ON", sltm: "0030" }, LATER)
        .sleepTimerInMinutes,
    ).toBe(30);
  });

  describe("of the first generation", () => {
    it.each([
      ["FAN", true, false],
      ["AUTO", true, true],
      ["OFF", false, false],
    ])("reads a fan mode of %s", (fmod, fanPower, autoMode) => {
      expect(
        parseEnvironmentalCareState({ fmod, fnsp: "0007" }, GENERATION_1),
      ).toMatchObject({ fanPower, autoMode, fanSpeed: 7 });
    });

    it("counts the target temperature from 273 K", () => {
      expect(
        parseEnvironmentalCareState(
          { fmod: "FAN", hmod: "OFF", hmax: "2950" },
          GENERATION_1,
        ),
      ).toMatchObject({ heatMode: "off", targetTemperatureInC: 22 });
    });
  });
});

describe("applyEnvironmentalCareControl", () => {
  it("carries only the fields the control sets", () => {
    expect(applyEnvironmentalCareControl(LATER, {})).toEqual({});
    expect(applyEnvironmentalCareControl(LATER, { nightMode: true })).toEqual({
      nmod: "ON",
    });
    expect(applyEnvironmentalCareControl(LATER, { fanPower: true })).toEqual({
      fpwr: "ON",
    });
  });

  it("encodes every field", () => {
    expect(
      applyEnvironmentalCareControl(LATER, {
        fanPower: false,
        autoMode: false,
        fanSpeed: 5,
        oscillationMode: "off",
        oscillationAngles: { lowerInDegrees: 90, upperInDegrees: 180 },
        nightMode: true,
        continuousMonitoring: false,
        sleepTimerInMinutes: 45,
        fanAirDirection: "backward",
        heatMode: "heat",
        targetTemperatureInC: 20.85,
        humidificationMode: "humidify",
        autoHumidification: true,
        manualHumidificationTargetInPercent: 40,
      }),
    ).toEqual({
      fpwr: "OFF",
      auto: "OFF",
      fnsp: "0005",
      oson: "OFF",
      osal: "0090",
      osau: "0180",
      ancp: "CUST",
      nmod: "ON",
      rhtm: "OFF",
      sltm: "0045",
      fdir: "OFF",
      hmod: "HEAT",
      hmax: "2940",
      hume: "HUMD",
      haut: "ON",
      humt: "0040",
    });
  });

  it("encodes each mode", () => {
    expect(
      applyEnvironmentalCareControl(LATER, {
        oscillationMode: "on",
        fanAirDirection: "forward",
        heatMode: "off",
        humidificationMode: "off",
        sleepTimerInMinutes: "off",
      }),
    ).toEqual({
      oson: "ON",
      fdir: "ON",
      hmod: "OFF",
      hume: "OFF",
      sltm: "OFF",
    });
  });

  describe("for a later type", () => {
    it("switches the machine on and its auto mode off with a fan speed", () => {
      expect(applyEnvironmentalCareControl(LATER, { fanSpeed: 3 })).toEqual({
        fpwr: "ON",
        auto: "OFF",
        fnsp: "0003",
      });
    });

    it.each([
      [true, "ON"],
      [false, "OFF"],
    ])("switches the machine on with an auto mode of %s", (autoMode, auto) => {
      expect(applyEnvironmentalCareControl(LATER, { autoMode })).toEqual({
        fpwr: "ON",
        auto,
      });
    });

    it("keeps the power and the auto mode the control sets", () => {
      expect(
        applyEnvironmentalCareControl(LATER, {
          fanPower: false,
          autoMode: true,
          fanSpeed: 3,
        }),
      ).toEqual({ fpwr: "OFF", auto: "ON", fnsp: "0003", sltm: "OFF" });
    });

    it("switches the sleep timer off with the machine", () => {
      expect(applyEnvironmentalCareControl(LATER, { fanPower: false })).toEqual(
        {
          fpwr: "OFF",
          sltm: "OFF",
        },
      );
    });

    it("keeps the sleep timer the control sets with a power off", () => {
      expect(
        applyEnvironmentalCareControl(LATER, {
          fanPower: false,
          sleepTimerInMinutes: 30,
        }),
      ).toEqual({ fpwr: "OFF", sltm: "0030" });
    });

    it("sends no auto with a fan speed to a type without an auto mode", () => {
      expect(
        applyEnvironmentalCareControl(WITHOUT_AUTO_MODE, { fanSpeed: 3 }),
      ).toEqual({
        fpwr: "ON",
        fnsp: "0003",
      });
    });
  });

  describe("for a type of the first generation", () => {
    it.each([
      ["power on", { fanPower: true }, { fmod: "FAN" }],
      ["power off", { fanPower: false }, { fmod: "OFF", sltm: "OFF" }],
      ["auto mode on", { autoMode: true }, { fmod: "AUTO" }],
      ["auto mode off", { autoMode: false }, { fmod: "FAN" }],
      ["a fan speed", { fanSpeed: 3 }, { fmod: "FAN", fnsp: "0003" }],
      [
        "power on in auto mode",
        { fanPower: true, autoMode: true },
        { fmod: "AUTO" },
      ],
      [
        "auto mode on with a fan speed",
        { autoMode: true, fanSpeed: 3 },
        { fmod: "AUTO", fnsp: "0003" },
      ],
      [
        "power off with a fan speed",
        { fanPower: false, fanSpeed: 3 },
        { fmod: "OFF", fnsp: "0003", sltm: "OFF" },
      ],
    ] as const)("writes the fan mode for %s", (_name, control, data) => {
      expect(applyEnvironmentalCareControl(GENERATION_1, control)).toEqual(
        data,
      );
    });

    it("writes no fan mode for a control without power, auto mode or fan speed", () => {
      expect(
        applyEnvironmentalCareControl(GENERATION_1, { nightMode: true }),
      ).toEqual({
        nmod: "ON",
      });
    });

    it("counts the target temperature from 273 K", () => {
      expect(
        applyEnvironmentalCareControl(GENERATION_1, {
          targetTemperatureInC: 22,
        }),
      ).toEqual({ hmax: "2950" });
    });
  });
});

describe("parseEnvironmentalCareSensors", () => {
  const NO_READING: EnvironmentalCareSensors = {
    temperatureInC: null,
    humidityInPercent: null,
    pm25InUgPerM3: null,
    pm25Index: null,
    pm10InUgPerM3: null,
    pm10Index: null,
    volatileOrganicCompoundsIndex: null,
    nitrogenDioxideIndex: null,
    formaldehydeInUgPerM3: null,
    formaldehydeIndex: null,
    carbonDioxideInPpm: null,
    carbonDioxideIndex: null,
    sleepTimerInMinutes: null,
  };

  it("reads every reading", () => {
    expect(
      parseEnvironmentalCareSensors(
        {
          tact: "2952",
          hact: "0055",
          pm25: "0027",
          p25r: "0025",
          pm10: "0019",
          p10r: "0025",
          va10: "0004",
          noxl: "0015",
          hcho: "0003",
          hchr: "0002",
          co2a: "0012",
          co2r: "0612",
        },
        LATER,
      ),
    ).toEqual({
      temperatureInC: 22.05,
      humidityInPercent: 55,
      pm25InUgPerM3: 25,
      pm25Index: 2.7,
      pm10InUgPerM3: 25,
      pm10Index: 1.9,
      volatileOrganicCompoundsIndex: 0.4,
      nitrogenDioxideIndex: 1.5,
      formaldehydeInUgPerM3: 2,
      formaldehydeIndex: 0.3,
      carbonDioxideInPpm: 612,
      carbonDioxideIndex: 1.2,
      sleepTimerInMinutes: null,
    });
  });

  it("reads no concentration from an index", () => {
    expect(
      parseEnvironmentalCareSensors({ pm25: "0027", pm10: "0019" }, LATER),
    ).toEqual({ ...NO_READING, pm25Index: 2.7, pm10Index: 1.9 });
  });

  it("reads a reading the machine lacks, or reports as no number, as null", () => {
    expect(
      parseEnvironmentalCareSensors({ tact: "OFF", hact: "OFF" }, LATER),
    ).toEqual(NO_READING);
  });

  it("counts the temperature of the first generation from 273 K", () => {
    expect(
      parseEnvironmentalCareSensors({ tact: "2950" }, GENERATION_1)
        .temperatureInC,
    ).toBe(22);
  });

  it("reads the sleep timer of the first generation", () => {
    expect(
      parseEnvironmentalCareSensors({ sltm: "0030" }, GENERATION_1)
        .sleepTimerInMinutes,
    ).toBe(30);
    expect(
      parseEnvironmentalCareSensors({ sltm: "OFF" }, GENERATION_1)
        .sleepTimerInMinutes,
    ).toBe("off");
  });
});

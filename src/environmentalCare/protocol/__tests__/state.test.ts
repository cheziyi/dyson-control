import { describe, expect, it } from "vitest";
import type {
  EnvironmentalCareControl,
  EnvironmentalCareSensors,
  EnvironmentalCareState,
} from "../../models/state.js";
import { decodeEnvironmentalCareCapabilities } from "../capabilities.js";
import {
  applyEnvironmentalCareControl,
  buildEnvironmentalCareFilterLifeReset,
  parseEnvironmentalCareSensors,
  parseEnvironmentalCareState,
} from "../state.js";
import { decodeEnvironmentalCareType } from "../type.js";

const LATER = { generation1: false };
const GENERATION_1 = { generation1: true };

// The fields a machine of the type is sent for the control.
function apply(
  machineType: string,
  control: EnvironmentalCareControl,
): Record<string, string> {
  const type = decodeEnvironmentalCareType(machineType);
  if (type === undefined) {
    throw new Error(`${machineType} is no known type`);
  }
  return applyEnvironmentalCareControl(
    type,
    decodeEnvironmentalCareCapabilities(
      { serialNumber: "S-1", type: machineType },
      type,
    ),
    control,
  );
}

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
  oscillationPresetAngleInDegrees: null,
  nightMode: null,
  continuousMonitoring: null,
  sleepTimerInMinutes: null,
  fanAirDirection: null,
  heatMode: null,
  targetTemperatureInC: null,
  humidificationMode: null,
  autoHumidification: null,
  manualHumidificationTargetInPercent: null,
  tiltAngleInDegrees: null,
  findAndFollowMode: null,
  waterHardness: null,
  oscillationState: null,
  findAndFollowState: null,
  cleanCycleState: null,
  remainingTimeToNextCleanCycleInHours: null,
  remainingTimeOfActiveCleanCycleInMinutes: null,
  filterLifeInHours: null,
  innerFilterLifeInPercent: null,
  outerFilterLifeInPercent: null,
  innerFilterType: null,
  outerFilterType: null,
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
      oscillationPresetAngleInDegrees: "custom",
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

  it.each([
    ["0045", 45],
    ["0350", 350],
    ["BRZE", "breeze"],
    ["CUST", "custom"],
    ["SMRT", null],
    ["0030", null],
  ])("reads an oscillation preset angle of %s as %s", (ancp, angle) => {
    expect(
      parseEnvironmentalCareState({ fpwr: "ON", ancp }, LATER)
        .oscillationPresetAngleInDegrees,
    ).toBe(angle);
  });

  it.each([
    ["ON", "on"],
    ["IDLE", "idle"],
    ["INV", "invalid"],
    ["NOD", "nod"],
    ["PAUSE", null],
  ])("reads an oscillation state of %s", (oscs, oscillationState) => {
    expect(
      parseEnvironmentalCareState({ fpwr: "ON", oscs }, LATER).oscillationState,
    ).toBe(oscillationState);
  });

  it("reads find and follow's mode and its state", () => {
    expect(
      parseEnvironmentalCareState(
        { fpwr: "ON", soon: "SCAN", sost: "ACS" },
        LATER,
      ),
    ).toMatchObject({ findAndFollowMode: "scan", findAndFollowState: "acs" });
  });

  it.each([
    [
      "a breeze",
      { otcs: "ON", anct: "BRZE", otal: "0359", otau: "0359" },
      "breeze",
    ],
    ["an angle", { otcs: "OFF", anct: "CUST", otal: "0025", otau: "0025" }, 25],
    ["no angle", { otcs: "OFF", anct: "CUST", otal: "0000", otau: "0000" }, 0],
    [
      "an angle that blows the air backward",
      { otcs: "OFF", anct: "CUST", otal: "0000", otau: "0000", fdir: "OFF" },
      50,
    ],
    [
      "two angles",
      { otcs: "OFF", anct: "CUST", otal: "0000", otau: "0025" },
      null,
    ],
    [
      "an angle of no preset",
      { otcs: "OFF", anct: "CUST", otal: "0010", otau: "0010" },
      null,
    ],
    ["a breeze that is not tilting", { otcs: "OFF", anct: "BRZE" }, null],
  ])("reads a tilt of %s", (_name, fields, tiltAngleInDegrees) => {
    expect(
      parseEnvironmentalCareState({ fpwr: "ON", ...fields }, LATER)
        .tiltAngleInDegrees,
    ).toBe(tiltAngleInDegrees);
  });

  it("reads a humidifier's clean cycle and the water hardness it is set for", () => {
    expect(
      parseEnvironmentalCareState(
        { fpwr: "OFF", clcr: "CLAC", cltr: "0036", cdrr: "0042", wath: "1350" },
        LATER,
      ),
    ).toMatchObject({
      cleanCycleState: "active",
      remainingTimeToNextCleanCycleInHours: 36,
      remainingTimeOfActiveCleanCycleInMinutes: 42,
      waterHardness: "medium",
    });
    expect(
      parseEnvironmentalCareState({ fpwr: "OFF", wath: "1000" }, LATER)
        .waterHardness,
    ).toBeNull();
  });

  it("reads the life and the type of the inner and the outer filter", () => {
    expect(
      parseEnvironmentalCareState(
        { fpwr: "ON", cflr: "0067", cflt: "CARF", hflr: "0073", hflt: "HSCO" },
        LATER,
      ),
    ).toMatchObject({
      innerFilterLifeInPercent: 67,
      outerFilterLifeInPercent: 73,
      innerFilterType: "carbon",
      outerFilterType: "hsco",
    });
  });

  it("reads a filter life above the most it holds as null", () => {
    expect(
      parseEnvironmentalCareState(
        { fmod: "FAN", filf: "4301", cflr: "0101", hflr: "INV" },
        GENERATION_1,
      ),
    ).toMatchObject({
      filterLifeInHours: null,
      innerFilterLifeInPercent: null,
      outerFilterLifeInPercent: null,
    });
    expect(
      parseEnvironmentalCareState({ fmod: "FAN", filf: "4300" }, GENERATION_1)
        .filterLifeInHours,
    ).toBe(4300);
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
    expect(apply("438", {})).toEqual({});
    expect(apply("438", { nightMode: true })).toEqual({
      nmod: "ON",
    });
    expect(apply("438", { fanPower: true })).toEqual({
      fpwr: "ON",
    });
  });

  it("encodes every field", () => {
    expect(
      apply("438", {
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

  it.each([
    [90, "0090"],
    [15, "0015"],
    ["breeze", "BRZE"],
  ] as const)("encodes an oscillation preset angle of %s", (angle, ancp) => {
    expect(apply("438", { oscillationPresetAngleInDegrees: angle })).toEqual({
      oson: "ON",
      ancp,
    });
  });

  it("switches the oscillation on with its angles, unless the control sets it", () => {
    expect(
      apply("438", {
        oscillationAngles: { lowerInDegrees: 90, upperInDegrees: 180 },
      }),
    ).toEqual({ oson: "ON", osal: "0090", osau: "0180", ancp: "CUST" });
    expect(
      apply("358", {
        oscillationMode: "idleOn",
        oscillationPresetAngleInDegrees: "breeze",
      }),
    ).toEqual({ oson: "OION", ancp: "BRZE" });
  });

  it.each([
    [0, { fdir: "ON", oton: "OFF", anct: "CUST", otau: "0000", otal: "0000" }],
    [25, { fdir: "ON", oton: "OFF", anct: "CUST", otau: "0025", otal: "0025" }],
    [
      50,
      { fdir: "OFF", oton: "OFF", anct: "CUST", otau: "0050", otal: "0050" },
    ],
    [
      "breeze",
      { fdir: "ON", oton: "ON", anct: "BRZE", otau: "0359", otal: "0359" },
    ],
  ] as const)("switches the machine on to tilt to %s", (angle, fields) => {
    expect(apply("664", { tiltAngleInDegrees: angle })).toEqual({
      fpwr: "ON",
      ...fields,
    });
  });

  it.each([
    ["on", { fpwr: "ON", soon: "ON" }],
    ["scan", { fpwr: "ON", soon: "SCAN" }],
    ["off", { soon: "OFF" }],
  ] as const)(
    "writes a find and follow mode of %s",
    (findAndFollowMode, data) => {
      expect(apply("438", { findAndFollowMode })).toEqual(data);
    },
  );

  it.each([
    ["soft", "2025"],
    ["medium", "1350"],
    ["hard", "0675"],
  ] as const)(
    "writes a water hardness of %s as its hours between clean cycles",
    (waterHardness, wath) => {
      expect(apply("358", { waterHardness })).toEqual({ wath });
    },
  );

  it("encodes each mode", () => {
    expect(
      apply("438", {
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
      expect(apply("438", { fanSpeed: 3 })).toEqual({
        fpwr: "ON",
        auto: "OFF",
        fnsp: "0003",
      });
    });

    it.each([
      [true, "ON"],
      [false, "OFF"],
    ])("switches the machine on with an auto mode of %s", (autoMode, auto) => {
      expect(apply("438", { autoMode })).toEqual({
        fpwr: "ON",
        auto,
      });
    });

    it("keeps the power and the auto mode the control sets", () => {
      expect(
        apply("438", {
          fanPower: false,
          autoMode: true,
          fanSpeed: 3,
        }),
      ).toEqual({ fpwr: "OFF", auto: "ON", fnsp: "0003", sltm: "OFF" });
    });

    it("switches the sleep timer off with the machine", () => {
      expect(apply("438", { fanPower: false })).toEqual({
        fpwr: "OFF",
        sltm: "OFF",
      });
    });

    it("keeps the sleep timer the control sets with a power off", () => {
      expect(
        apply("438", {
          fanPower: false,
          sleepTimerInMinutes: 30,
        }),
      ).toEqual({ fpwr: "OFF", sltm: "0030" });
    });

    it("sends no auto with a fan speed to a type without an auto mode", () => {
      expect(apply("635", { fanSpeed: 3 })).toEqual({
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
      expect(apply("475", control)).toEqual(data);
    });

    it("writes no fan mode for a control without power, auto mode or fan speed", () => {
      expect(apply("475", { nightMode: true })).toEqual({
        nmod: "ON",
      });
    });

    it("counts the target temperature from 273 K", () => {
      expect(
        apply("475", {
          targetTemperatureInC: 22,
        }),
      ).toEqual({ hmax: "2950" });
    });
  });
});

describe("buildEnvironmentalCareFilterLifeReset", () => {
  it.each([
    ["filter", "rstf"],
    ["innerFilter", "rscf"],
    ["outerFilter", "rshf"],
  ] as const)("resets the %s by its own field", (filter, field) => {
    expect(buildEnvironmentalCareFilterLifeReset(filter)).toEqual({
      [field]: "RSTF",
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

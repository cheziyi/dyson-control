import { describe, expect, it } from "vitest";
import * as tables from "../tables.js";

// Every function reads each type, message, field and code from one table,
// so each table is written out a second time here.
describe("the environmental care tables", () => {
  it("hold every type, message, field and code as a machine does", () => {
    expect({ ...tables }).toEqual({
      ENVIRONMENTAL_CARE_GENERATION_1_TYPES: ["455", "455C", "469", "475"],
      ENVIRONMENTAL_CARE_LATER_TYPES: [
        ...["358", "358E", "358K", "438", "438E", "438K", "520"],
        ...["527", "527E", "527K", "635", "664", "739", "831", "897"],
        ...["917", "918", "949", "960", "965", "994", "997", "1018"],
      ],
      ENVIRONMENTAL_CARE_TYPES_WITHOUT_AUTO_MODE: ["635", "739", "949", "960"],
      ENVIRONMENTAL_CARE_TYPES_WITHOUT_CONTINUOUS_MONITORING: ["739", "960"],
      ENVIRONMENTAL_CARE_TYPES_WITH_HEAT_MODE: [
        ...["455", "527", "527E", "527K", "635", "918"],
      ],
      ENVIRONMENTAL_CARE_TYPES_WITH_FAN_AIR_DIRECTION: [
        ...["358", "358E", "358K", "438", "438E", "438K", "520"],
        ...["527", "527E", "527K"],
      ],
      ENVIRONMENTAL_CARE_VARIANTS_WITHOUT_FAN_AIR_DIRECTION: ["438M", "527M"],
      ENVIRONMENTAL_CARE_TYPES_WITH_HUMIDIFICATION_MODE: [
        ...["358", "358E", "358K", "965"],
      ],
      ENVIRONMENTAL_CARE_TYPES_WITH_AUTO_HUMIDIFICATION: [
        "358",
        "358E",
        "358K",
      ],
      ENVIRONMENTAL_CARE_TYPES_WITH_BARREL_OSCILLATION: ["358", "358E", "358K"],
      ENVIRONMENTAL_CARE_BARREL_OSCILLATION_PRESET_ANGLES: [45, 90, "breeze"],
      ENVIRONMENTAL_CARE_ADVANCED_OSCILLATION_PRESET_ANGLES: [45, 90, 180, 350],
      ENVIRONMENTAL_CARE_NARROW_OSCILLATION_PRESET_ANGLES: [15, 40, 70],
      ENVIRONMENTAL_CARE_TYPES_WITH_NARROW_OSCILLATION_PRESET_ANGLES: [
        ...["635", "739"],
      ],
      ENVIRONMENTAL_CARE_TYPES_WITH_TILT_OSCILLATION: ["664"],
      ENVIRONMENTAL_CARE_TYPES_WITHOUT_BASIC_OSCILLATION: ["897", "965"],
      ENVIRONMENTAL_CARE_TYPES_WITHOUT_ADVANCED_OSCILLATION: [
        ...["965", "997", "1018"],
      ],
      ENVIRONMENTAL_CARE_TYPES_WITHOUT_AIR_QUALITY_SENSOR: ["739", "960"],
      ENVIRONMENTAL_CARE_FIRMWARE_CAPABILITIES: {
        advanceOscillationDay0: "AdvanceOscillationDay0",
        advanceOscillationDay1: "AdvanceOscillationDay1",
      },
      ENVIRONMENTAL_CARE_COMMANDS: {
        requestCurrentState: "REQUEST-CURRENT-STATE",
        requestProductEnvironmentCurrentSensorData:
          "REQUEST-PRODUCT-ENVIRONMENT-CURRENT-SENSOR-DATA",
        stateSet: "STATE-SET",
      },
      ENVIRONMENTAL_CARE_MESSAGES: {
        currentState: "CURRENT-STATE",
        stateChange: "STATE-CHANGE",
        environmentalCurrentSensorData: "ENVIRONMENTAL-CURRENT-SENSOR-DATA",
      },
      ENVIRONMENTAL_CARE_FIELDS: {
        fanPower: "fpwr",
        autoMode: "auto",
        fanMode: "fmod",
        fanSpeed: "fnsp",
        oscillationMode: "oson",
        oscillationLowerAngle: "osal",
        oscillationUpperAngle: "osau",
        oscillationPresetAngle: "ancp",
        nightMode: "nmod",
        continuousMonitoring: "rhtm",
        sleepTimer: "sltm",
        fanAirDirection: "fdir",
        heatMode: "hmod",
        targetTemperature: "hmax",
        humidificationMode: "hume",
        autoHumidification: "haut",
        manualHumidificationTarget: "humt",
      },
      ENVIRONMENTAL_CARE_SENSOR_FIELDS: {
        temperature: "tact",
        humidity: "hact",
        pm25: "pm25",
        highResolutionPm25: "p25r",
        pm10: "pm10",
        highResolutionPm10: "p10r",
        generation2VolatileOrganicCompounds: "va10",
        nitrogenDioxide: "noxl",
        formaldehyde: "hcho",
        highResolutionFormaldehyde: "hchr",
        carbonDioxide: "co2a",
        highResolutionCarbonDioxide: "co2r",
        sleepTimer: "sltm",
      },
      ENVIRONMENTAL_CARE_SWITCH_CODES: { on: "ON", off: "OFF" },
      ENVIRONMENTAL_CARE_FAN_MODE_CODES: {
        off: "OFF",
        fan: "FAN",
        auto: "AUTO",
      },
      ENVIRONMENTAL_CARE_OSCILLATION_MODE_CODES: {
        off: "OFF",
        on: "ON",
        idleOff: "OIOF",
        idleOn: "OION",
        scan: "SCAN",
      },
      ENVIRONMENTAL_CARE_FAN_AIR_DIRECTION_CODES: {
        forward: "ON",
        backward: "OFF",
      },
      ENVIRONMENTAL_CARE_HEAT_MODE_CODES: { off: "OFF", heat: "HEAT" },
      ENVIRONMENTAL_CARE_HUMIDIFICATION_MODE_CODES: {
        off: "OFF",
        humidify: "HUMD",
      },
      ENVIRONMENTAL_CARE_OSCILLATION_PRESET_ANGLE_CODES: {
        breeze: "BRZE",
        custom: "CUST",
      },
      ENVIRONMENTAL_CARE_KELVIN_OFFSETS: { generation1: 273, later: 273.15 },
    });
  });
});

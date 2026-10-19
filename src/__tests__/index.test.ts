import { describe, expect, it } from "vitest";
import * as dysonControl from "../index.js";

describe("the package", () => {
  it("exports the clients, account calls, value lists and errors, and nothing else", () => {
    expect(Object.keys(dysonControl).sort()).toEqual([
      "CLEAN_CYCLE_STATES",
      "DysonConnectionError",
      "DysonError",
      "EnvironmentalCareClient",
      "FAN_AIR_DIRECTIONS",
      "FAN_SPEEDS",
      "FILTERS",
      "FIND_AND_FOLLOW_MODES",
      "HEAT_MODES",
      "HUMIDIFICATION_MODES",
      "INNER_FILTER_TYPES",
      "MACHINE_CATEGORIES",
      "OSCILLATION_MODES",
      "OSCILLATION_PRESET_ANGLES",
      "OSCILLATION_STATES",
      "OUTER_FILTER_TYPES",
      "REMOTE_BROKER_TYPES",
      "TILT_ANGLES",
      "WATER_HARDNESSES",
      "getCountries",
      "getMachines",
      "login",
      "requestLoginCode",
    ]);
  });
});

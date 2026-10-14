import { describe, expect, it } from "vitest";
import * as dysonControl from "../index.js";

describe("the package", () => {
  it("exports the clients, account calls, value lists and errors, and nothing else", () => {
    expect(Object.keys(dysonControl).sort()).toEqual([
      "DysonConnectionError",
      "DysonError",
      "EnvironmentalCareClient",
      "FAN_AIR_DIRECTIONS",
      "FAN_SPEEDS",
      "HEAT_MODES",
      "HUMIDIFICATION_MODES",
      "MACHINE_CATEGORIES",
      "OSCILLATION_MODES",
      "REMOTE_BROKER_TYPES",
      "getCountries",
      "getMachines",
      "login",
      "requestLoginCode",
    ]);
  });
});

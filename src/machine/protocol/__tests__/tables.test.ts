import { describe, expect, it } from "vitest";
import * as tables from "../tables.js";

describe("the machine tables", () => {
  it("hold every topic, code and port as a machine does", () => {
    expect({ ...tables }).toEqual({
      MACHINE_TOPICS: { command: "command", status: "status/current" },
      MACHINE_MODE_REASONS: { remote: "RAPP", local: "LAPP" },
      MACHINE_BROKER_PORT: 1883,
    });
  });
});

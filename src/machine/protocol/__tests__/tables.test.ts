import { describe, expect, it } from "vitest";
import * as tables from "../tables.js";

describe("the machine tables", () => {
  it("hold every topic and code as a machine does", () => {
    expect({ ...tables }).toEqual({
      MACHINE_TOPICS: { command: "command", status: "status/current" },
      MACHINE_MODE_REASON: "RAPP",
    });
  });
});

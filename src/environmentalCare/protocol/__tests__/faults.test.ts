import { describe, expect, it } from "vitest";
import { parseEnvironmentalCareFaults } from "../faults.js";

// As a 897 sends it, with one fault in each group.
const CURRENT_FAULTS = {
  msg: "CURRENT-FAULTS",
  time: "2026-10-19T09:03:22.000Z",
  "product-errors": { com2: "OK", iuh0: "FAIL", sen1: "FAIL", amf5: "OK" },
  "product-warnings": { fltr: "FAIL" },
  "module-errors": { szme: "OK", lspd: "FAIL" },
  "module-warnings": { srnk: "OK", nwcs: "FAIL" },
};

describe("parseEnvironmentalCareFaults", () => {
  it("names each fault the machine has, in its group", () => {
    expect(parseEnvironmentalCareFaults(CURRENT_FAULTS)).toEqual({
      productErrors: ["iuh0", "dustSensor"],
      productWarnings: ["filterReplacement"],
      moduleErrors: ["environmentalDataLost"],
      moduleWarnings: ["networkCloudConnectIssue"],
    });
  });

  it("reads the new value of each fault of a FAULTS-CHANGE", () => {
    expect(
      parseEnvironmentalCareFaults({
        msg: "FAULTS-CHANGE",
        "product-warnings": { fltr: ["OK", "FAIL"], tnke: ["FAIL", "OK"] },
      }),
    ).toEqual({
      productErrors: [],
      productWarnings: ["filterReplacement"],
      moduleErrors: [],
      moduleWarnings: [],
    });
  });

  it("keeps the code of a fault whose name is not known, even one an object inherits", () => {
    expect(
      parseEnvironmentalCareFaults({
        msg: "CURRENT-FAULTS",
        "product-errors": { toString: "FAIL" },
      })?.productErrors,
    ).toEqual(["toString"]);
  });

  it.each([
    ["another message", { msg: "CURRENT-STATE", "product-errors": {} }],
    ["faults without a group", { msg: "CURRENT-FAULTS" }],
  ])("answers undefined for %s", (_name, message) => {
    expect(parseEnvironmentalCareFaults(message)).toBeUndefined();
  });
});

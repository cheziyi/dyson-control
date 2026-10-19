import { describe, expect, it } from "vitest";
import { buildMachineBroker } from "../broker.js";

describe("buildMachineBroker", () => {
  it("logs in to port 1883 of the host as the serial number, with the password and the client id", () => {
    expect(
      buildMachineBroker(
        { serialNumber: "A1B-EU-ABC1234D" },
        "A1B-EU-ABC1234D.local",
        "hash-1",
        "client-1",
      ),
    ).toEqual({
      url: "mqtt://A1B-EU-ABC1234D.local:1883",
      clientId: "client-1",
      username: "A1B-EU-ABC1234D",
      password: "hash-1",
    });
  });
});

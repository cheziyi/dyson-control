import { describe, expect, it } from "vitest";
import { getCountries } from "../countries.js";
import { json, reset, useMockCloud } from "./mocks/cloud.js";

const cloud = useMockCloud();

describe("getCountries", () => {
  it("asks the global cloud with no account, and resolves with the countries", async () => {
    cloud.reply = () => json(["GB", "US", "CN"]);

    await expect(getCountries()).resolves.toEqual(["GB", "US", "CN"]);

    expect(cloud.requests).toMatchObject([
      {
        method: "GET",
        url: "https://appapi.cp.dyson.com/v1/supportedmarket",
        headers: { "User-Agent": "dyson-control" },
        body: undefined,
      },
    ]);
    expect(cloud.requests[0]?.headers).not.toHaveProperty("Authorization");
  });

  it("sends the user agent it is given in place of its own", async () => {
    cloud.reply = () => json([]);

    await getCountries({ userAgent: "my-app/1.0" });

    expect(cloud.requests[0]?.headers).toMatchObject({
      "User-Agent": "my-app/1.0",
    });
  });

  it("asks again after a connection the cloud resets", async () => {
    cloud.reply = () => (cloud.requests.length === 1 ? reset() : json(["GB"]));

    await expect(getCountries()).resolves.toEqual(["GB"]);

    expect(cloud.requests).toHaveLength(2);
  });
});

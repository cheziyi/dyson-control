import { describe, expect, it } from "vitest";
import { getMachines } from "../machines.js";
import { ACCOUNT, json, useMockCloud } from "./mocks/cloud.js";

const cloud = useMockCloud();

describe("getMachines", () => {
  it("sends the account's token and resolves with the machines the broker reaches", async () => {
    cloud.reply = () =>
      json([
        {
          serialNumber: "S-1",
          type: "438",
          category: "ec",
          connectedConfiguration: { mqtt: { remoteBrokerType: "wss" } },
        },
        {
          serialNumber: "S-2",
          type: "276",
          category: "robot",
          connectedConfiguration: { mqtt: { remoteBrokerType: "wss" } },
        },
        { serialNumber: "S-3", type: "999", category: "hc" },
      ]);

    await expect(getMachines(ACCOUNT)).resolves.toEqual([
      {
        serialNumber: "S-1",
        type: "438",
        category: "environmentalCare",
        remoteBrokerType: "awsIot",
      },
      {
        serialNumber: "S-2",
        type: "276",
        category: "robot",
        remoteBrokerType: "awsIot",
      },
    ]);

    expect(cloud.requests).toMatchObject([
      {
        method: "GET",
        url: "https://appapi.cp.dyson.com/v3/manifest?market=GB&locale=en-GB",
        headers: { Authorization: "Bearer abc" },
        body: undefined,
      },
    ]);
  });

  it("sends its own user agent, or the one it is given", async () => {
    cloud.reply = () => json([]);

    await getMachines(ACCOUNT);
    await getMachines(ACCOUNT, { userAgent: "my-app/1.0" });

    expect(cloud.requests.map((each) => each.headers["User-Agent"])).toEqual([
      "dyson-control",
      "my-app/1.0",
    ]);
  });
});

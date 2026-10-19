import { describe, expect, it } from "vitest";
import { getCloudBroker } from "../broker.js";
import { DysonCloudTransport } from "../transport.js";
import { CREDENTIALS, MACHINE } from "./mocks/broker.js";
import { ACCOUNT, json, useMockCloud } from "./mocks/cloud.js";

const cloud = useMockCloud();

function get(machine = MACHINE) {
  return getCloudBroker(
    machine,
    new DysonCloudTransport({ country: "GB", account: ACCOUNT }),
  );
}

describe("getCloudBroker", () => {
  it("asks the cloud for credentials, and logs in to its broker with them over ALPN mqtt", async () => {
    cloud.reply = () => json(CREDENTIALS);

    await expect(get()).resolves.toEqual({
      url: "mqtts://broker.example.com:443",
      clientId: "client-1",
      username:
        "?x-amz-customauthorizer-name=authorizer" +
        "&x-amz-customauthorizer-signature=signature" +
        "&token=value-1",
      ALPNProtocols: ["mqtt"],
    });
    expect(cloud.requests).toMatchObject([
      {
        method: "POST",
        url: "https://appapi.cp.dyson.com/v2/authorize/iot-credentials",
        headers: { Authorization: "Bearer abc" },
        body: { Serial: "S-1" },
      },
    ]);
  });

  it("rejects with the cloud's status when it hands out no credentials", async () => {
    cloud.reply = () => json({}, 401);

    await expect(get()).rejects.toMatchObject({ httpStatusCode: 401 });
  });

  it("rejects with status 501 for a machine on the RabbitMQ broker, and asks for nothing", async () => {
    await expect(
      get({ ...MACHINE, remoteBrokerType: "rabbitMq" } as typeof MACHINE),
    ).rejects.toMatchObject({ httpStatusCode: 501 });

    expect(cloud.requests).toHaveLength(0);
  });
});

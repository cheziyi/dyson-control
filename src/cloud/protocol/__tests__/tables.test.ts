import { describe, expect, it } from "vitest";
import * as tables from "../tables.js";

describe("the cloud tables", () => {
  it("hold every host, route, header and code as the cloud does", () => {
    expect({ ...tables }).toEqual({
      CLOUD_ORIGINS: {
        global: "https://appapi.cp.dyson.com",
        china: "https://appapi.cp.dyson.cn",
      },
      CLOUD_CHINA_COUNTRY: "CN",
      CLOUD_ROUTES: {
        loginCode: "/v3/userregistration/email/auth",
        logIn: "/v3/userregistration/email/verify",
        manifest: "/v3/manifest",
        iotCredentials: "/v2/authorize/iot-credentials",
      },
      CLOUD_HEADERS: {
        "X-Platform": "android",
        "X-App-Version": "6.4.26381",
        "User-Agent": "okhttp/4.12.0",
      },
      CLOUD_CATEGORY_CODES: {
        environmentalCare: "ec",
        robot: "robot",
        lighting: "light",
        wearableEnvironmentalCare: "wearable",
        hairCare: "hc",
        floorCare: "flrc",
        formulation: "formulation",
        oralCare: "oc",
      },
      CLOUD_REMOTE_BROKER_TYPE_CODES: { awsIot: "wss", rabbitMq: "mqtts" },
      CLOUD_BROKER_PORT: 443,
      CLOUD_BROKER_ALPN_PROTOCOL: "mqtt",
      CLOUD_AUTHORIZER_PARAMETERS: {
        name: "x-amz-customauthorizer-name",
        signature: "x-amz-customauthorizer-signature",
      },
    });
  });
});

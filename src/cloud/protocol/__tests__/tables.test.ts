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
      CLOUD_LOGIN_CODE_USER_STATUS: {
        accountStatus: "ACTIVE",
        authenticationMethods: ["EMAIL_PASSWORD_2FA", "EMAIL_PWD_2FA"],
      },
      CLOUD_ROUTES: {
        userStatus: "/v3/userregistration/email/userstatus",
        loginCode: "/v3/userregistration/email/auth",
        login: "/v3/userregistration/email/verify",
        manifest: "/v3/manifest",
        iotCredentials: "/v2/authorize/iot-credentials",
        supportedMarket: "/v1/supportedmarket",
      },
      CLOUD_MACHINE_CATEGORY_CODES: {
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

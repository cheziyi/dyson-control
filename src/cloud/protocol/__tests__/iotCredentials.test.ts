import { describe, expect, it } from "vitest";
import {
  buildCloudBroker,
  buildIotCredentialsRequest,
  encodeIotUsername,
  parseIotCredentials,
} from "../iotCredentials.js";

const REPLY = {
  Endpoint: "abc-ats.iot.eu-west-1.amazonaws.com",
  IoTCredentials: {
    ClientId: "client-1",
    CustomAuthorizerName: "authorizer",
    TokenKey: "token",
    TokenValue: "value-1",
    TokenSignature: "a+b/c=",
  },
};

const CREDENTIALS = {
  endpoint: "abc-ats.iot.eu-west-1.amazonaws.com",
  clientId: "client-1",
  customAuthorizerName: "authorizer",
  tokenKey: "token",
  tokenValue: "value-1",
  tokenSignature: "a+b/c=",
};

describe("the IoT credentials", () => {
  it("are requested for a serial number", () => {
    expect(buildIotCredentialsRequest("S-1")).toEqual({ Serial: "S-1" });
  });

  it("are read from the reply", () => {
    expect(parseIotCredentials(JSON.stringify(REPLY))).toEqual(CREDENTIALS);
  });

  it("throw status 502 for a reply that lacks a field", () => {
    expect(() =>
      parseIotCredentials(JSON.stringify({ ...REPLY, IoTCredentials: {} })),
    ).toThrow(expect.objectContaining({ httpStatusCode: 502 }));
  });
});

describe("buildCloudBroker", () => {
  it("names the broker on port 443 over ALPN mqtt, logged in to as the credentials under the client id", () => {
    expect(buildCloudBroker(CREDENTIALS, "client-2")).toEqual({
      url: "mqtts://abc-ats.iot.eu-west-1.amazonaws.com:443",
      clientId: "client-2",
      username: encodeIotUsername(CREDENTIALS),
      ALPNProtocols: ["mqtt"],
    });
  });
});

describe("encodeIotUsername", () => {
  it("names the authorizer, then the signature, then the token", () => {
    expect(encodeIotUsername(CREDENTIALS)).toBe(
      "?x-amz-customauthorizer-name=authorizer" +
        "&x-amz-customauthorizer-signature=a%2Bb%2Fc%3D" +
        "&token=value-1",
    );
  });

  it("sends a signature that is percent-encoded already as given", () => {
    expect(
      encodeIotUsername({ ...CREDENTIALS, tokenSignature: "a%2Bb" }),
    ).toContain("&x-amz-customauthorizer-signature=a%2Bb&");
  });
});

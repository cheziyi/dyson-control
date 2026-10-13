import { describe, expect, it } from "vitest";
import { DysonError } from "../../../error.js";
import {
  buildLogInRequest,
  buildLoginCodeRequest,
  encodeAccountToken,
  encodeCloudOrigin,
  parseCloudReply,
  parseLogInReply,
  parseLoginCodeReply,
} from "../account.js";

const REGION = { country: "GB", culture: "en-GB" };

describe("encodeCloudOrigin", () => {
  it("sends CN to the cloud for China and any other country to the global one", () => {
    expect(encodeCloudOrigin("CN")).toBe("https://appapi.cp.dyson.cn");
    expect(encodeCloudOrigin("GB")).toBe("https://appapi.cp.dyson.com");
  });
});

describe("encodeAccountToken", () => {
  it("writes the token after its type", () => {
    expect(encodeAccountToken({ token: "abc", tokenType: "Bearer" })).toEqual({
      Authorization: "Bearer abc",
    });
  });
});

describe("the login code", () => {
  it("is requested for an email address", () => {
    expect(buildLoginCodeRequest("me@example.com")).toEqual({
      email: "me@example.com",
    });
  });

  it("is answered with a challengeId", () => {
    expect(parseLoginCodeReply('{"challengeId":"c-1"}')).toBe("c-1");
  });

  it("throws status 502 for a reply without one", () => {
    expect(() => parseLoginCodeReply("{}")).toThrow(
      new DysonError("The Dyson cloud sent no challengeId", 502),
    );
  });
});

describe("the login", () => {
  it("sends the password with the challengeId and the code", () => {
    expect(
      buildLogInRequest({
        email: "me@example.com",
        password: "secret",
        challengeId: "c-1",
        otpCode: "123456",
        // A caller passes its options whole: nothing else is sent.
        ...REGION,
      }),
    ).toEqual({
      email: "me@example.com",
      password: "secret",
      challengeId: "c-1",
      otpCode: "123456",
    });
  });

  it("is answered with the account", () => {
    expect(
      parseLogInReply(
        '{"account":"a-1","token":"abc","tokenType":"Bearer"}',
        REGION,
      ),
    ).toEqual({
      country: "GB",
      culture: "en-GB",
      accountId: "a-1",
      token: "abc",
      tokenType: "Bearer",
    });
  });

  it("throws status 502 for a reply without a token", () => {
    expect(() => parseLogInReply('{"account":"a-1"}', REGION)).toThrow(
      new DysonError("The Dyson cloud sent no token", 502),
    );
  });
});

describe("parseCloudReply", () => {
  it.each(["not json", "[]", "3", "null"])(
    "throws status 502 for %s",
    (text) => {
      expect(() => parseCloudReply(text)).toThrow(
        expect.objectContaining({ httpStatusCode: 502 }),
      );
    },
  );
});

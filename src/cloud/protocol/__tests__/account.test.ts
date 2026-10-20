import { describe, expect, it } from "vitest";
import { DysonError } from "../../../error.js";
import {
  buildLoginCodeRequest,
  buildLoginRequest,
  buildUserStatusRequest,
  encodeAccountToken,
  encodeCloudOrigin,
  encodeUserAgent,
  parseCloudReply,
  parseLoginCodeReply,
  parseLoginReply,
  parseUserStatusReply,
} from "../account.js";

const REGION = { country: "GB", culture: "en-GB" };

describe("encodeCloudOrigin", () => {
  it("sends CN to the cloud for China, and any other country or none to the global one", () => {
    expect(encodeCloudOrigin("CN")).toBe("https://appapi.cp.dyson.cn");
    expect(encodeCloudOrigin("GB")).toBe("https://appapi.cp.dyson.com");
    expect(encodeCloudOrigin()).toBe("https://appapi.cp.dyson.com");
  });
});

describe("encodeUserAgent", () => {
  it("writes the value as the User-Agent", () => {
    expect(encodeUserAgent("my-app/1.0")).toEqual({
      "User-Agent": "my-app/1.0",
    });
  });
});

describe("encodeAccountToken", () => {
  it("writes the token after its type", () => {
    expect(encodeAccountToken({ token: "abc", tokenType: "Bearer" })).toEqual({
      Authorization: "Bearer abc",
    });
  });
});

describe("the user status", () => {
  it("is requested for an email address", () => {
    expect(buildUserStatusRequest("me@example.com")).toEqual({
      email: "me@example.com",
    });
  });

  it.each(["EMAIL_PASSWORD_2FA", "EMAIL_PWD_2FA"])(
    "passes an active account whose authenticationMethod is %s",
    (authenticationMethod) => {
      expect(() =>
        parseUserStatusReply(
          JSON.stringify({ accountStatus: "ACTIVE", authenticationMethod }),
        ),
      ).not.toThrow();
    },
  );

  it.each(["UNREGISTERED", "NEEDS_ACTIVATION"])(
    "throws status 401 for an accountStatus of %s",
    (accountStatus) => {
      expect(() =>
        parseUserStatusReply(
          JSON.stringify({
            accountStatus,
            authenticationMethod: "EMAIL_PASSWORD_2FA",
          }),
        ),
      ).toThrow(
        new DysonError(
          `The Dyson cloud emails no login code for an accountStatus of ${accountStatus}`,
          401,
        ),
      );
    },
  );

  it("throws status 401 for an authenticationMethod of EMAIL_PASSWORD", () => {
    expect(() =>
      parseUserStatusReply(
        '{"accountStatus":"ACTIVE","authenticationMethod":"EMAIL_PASSWORD"}',
      ),
    ).toThrow(
      new DysonError(
        "The Dyson cloud emails no login code for an authenticationMethod of EMAIL_PASSWORD",
        401,
      ),
    );
  });

  it("throws status 502 for a reply without an accountStatus", () => {
    expect(() =>
      parseUserStatusReply('{"authenticationMethod":"EMAIL_PASSWORD_2FA"}'),
    ).toThrow(new DysonError("The Dyson cloud sent no accountStatus", 502));
  });

  it("throws status 502 for a reply without an authenticationMethod", () => {
    expect(() => parseUserStatusReply('{"accountStatus":"ACTIVE"}')).toThrow(
      new DysonError("The Dyson cloud sent no authenticationMethod", 502),
    );
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
      buildLoginRequest({
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
      parseLoginReply(
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
    expect(() => parseLoginReply('{"account":"a-1"}', REGION)).toThrow(
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

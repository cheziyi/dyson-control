import { describe, expect, it } from "vitest";
import { DysonError } from "../../error.js";
import { login, requestLoginCode } from "../login.js";
import {
  ACCOUNT,
  type CloudRequest,
  json,
  reset,
  useMockCloud,
} from "./mocks/cloud.js";

const cloud = useMockCloud();

describe("requestLoginCode", () => {
  const ACTIVE = {
    accountStatus: "ACTIVE",
    authenticationMethod: "EMAIL_PASSWORD_2FA",
  };

  function replyAs(status: unknown): (request: CloudRequest) => Response {
    return (request) =>
      request.url.includes("/userstatus")
        ? json(status)
        : json({ challengeId: "c-1" });
  }

  it("asks for the user status, then posts the email address and resolves with the challengeId", async () => {
    cloud.reply = replyAs(ACTIVE);

    await expect(
      requestLoginCode({
        email: "me@example.com",
        country: "GB",
        culture: "en-GB",
      }),
    ).resolves.toBe("c-1");

    expect(cloud.requests).toMatchObject([
      {
        method: "POST",
        url: "https://appapi.cp.dyson.com/v3/userregistration/email/userstatus?country=GB",
        headers: {
          "User-Agent": "dyson-control",
          "Content-Type": "application/json",
        },
        body: { email: "me@example.com" },
      },
      {
        method: "POST",
        url: "https://appapi.cp.dyson.com/v3/userregistration/email/auth?country=GB&culture=en-GB",
        headers: {
          "User-Agent": "dyson-control",
          "Content-Type": "application/json",
        },
        body: { email: "me@example.com" },
      },
    ]);
    for (const request of cloud.requests) {
      expect(request.headers).not.toHaveProperty("Authorization");
    }
  });

  it("resolves with null, and asks for no code, for an account that logs in with its password alone", async () => {
    cloud.reply = replyAs({
      accountStatus: "ACTIVE",
      authenticationMethod: "EMAIL_PASSWORD",
    });

    await expect(
      requestLoginCode({ email: "me@example.com" }),
    ).resolves.toBeNull();

    expect(cloud.requests).toHaveLength(1);
  });

  it("rejects with status 401, and asks for no code, for an address the cloud logs no account in for", async () => {
    cloud.reply = replyAs({
      accountStatus: "UNREGISTERED",
      authenticationMethod: "EMAIL_PASSWORD_2FA",
    });

    await expect(requestLoginCode({ email: "me@example.com" })).rejects.toEqual(
      new DysonError(
        "The Dyson cloud logs in no account with an accountStatus of UNREGISTERED",
        401,
      ),
    );

    expect(cloud.requests).toHaveLength(1);
  });

  it("sends the user agent it is given in place of its own", async () => {
    cloud.reply = replyAs(ACTIVE);

    await requestLoginCode({
      email: "me@example.com",
      country: "GB",
      culture: "en-GB",
      userAgent: "my-app/1.0",
    });

    for (const request of cloud.requests) {
      expect(request.headers).toMatchObject({ "User-Agent": "my-app/1.0" });
    }
  });

  it("sends the country US and the culture en-US when it is given neither", async () => {
    cloud.reply = replyAs(ACTIVE);

    await requestLoginCode({ email: "me@example.com" });

    expect(cloud.requests.map((request) => request.url)).toEqual([
      "https://appapi.cp.dyson.com/v3/userregistration/email/userstatus?country=US",
      "https://appapi.cp.dyson.com/v3/userregistration/email/auth?country=US&culture=en-US",
    ]);
  });

  it("asks the cloud for China for an account there", async () => {
    cloud.reply = replyAs(ACTIVE);

    await requestLoginCode({
      email: "me@example.com",
      country: "CN",
      culture: "zh-CN",
    });

    expect(cloud.requests.map((request) => request.url)).toEqual([
      "https://appapi.cp.dyson.cn/v3/userregistration/email/userstatus?country=CN",
      "https://appapi.cp.dyson.cn/v3/userregistration/email/auth?country=CN&culture=zh-CN",
    ]);
  });

  it("rejects with the cloud's status for a code it refuses", async () => {
    cloud.reply = (request) =>
      request.url.includes("/userstatus") ? json(ACTIVE) : json({}, 429);

    await expect(requestLoginCode({ email: "me@example.com" })).rejects.toEqual(
      new DysonError(
        "Dyson request to /v3/userregistration/email/auth failed",
        429,
      ),
    );
  });

  it("asks once, even after a connection the cloud resets", async () => {
    cloud.reply = reset;

    await expect(
      requestLoginCode({ email: "me@example.com" }),
    ).rejects.toMatchObject({ httpStatusCode: 503 });

    expect(cloud.requests).toHaveLength(1);
  });
});

describe("login", () => {
  const options = {
    email: "me@example.com",
    password: "secret",
    challengeId: "c-1",
    otpCode: "123456",
    country: "GB",
    culture: "en-GB",
  };

  it("posts the password and the code, and resolves with the account", async () => {
    cloud.reply = () =>
      json({ account: "a-1", token: "abc", tokenType: "Bearer" });

    await expect(login(options)).resolves.toEqual(ACCOUNT);

    expect(cloud.requests).toMatchObject([
      {
        method: "POST",
        url: "https://appapi.cp.dyson.com/v3/userregistration/email/verify?country=GB",
        body: {
          email: "me@example.com",
          password: "secret",
          challengeId: "c-1",
          otpCode: "123456",
        },
      },
    ]);
  });

  it("posts the password alone, to the route that takes no code, for an account without one", async () => {
    cloud.reply = () =>
      json({ account: "a-1", token: "abc", tokenType: "Bearer" });

    await expect(
      login({
        email: "me@example.com",
        password: "secret",
        country: "GB",
        culture: "en-GB",
      }),
    ).resolves.toEqual(ACCOUNT);

    expect(cloud.requests).toMatchObject([
      {
        method: "POST",
        url: "https://appapi.cp.dyson.com/v3/userregistration/authenticate?country=GB",
        body: { email: "me@example.com", password: "secret" },
      },
    ]);
    expect(cloud.requests[0]?.body).not.toHaveProperty("challengeId");
  });

  it("sends the country US, and resolves with it and the culture en-US, when it is given neither", async () => {
    cloud.reply = () =>
      json({ account: "a-1", token: "abc", tokenType: "Bearer" });
    const { country: _country, culture: _culture, ...credentials } = options;

    await expect(login(credentials)).resolves.toEqual({
      ...ACCOUNT,
      country: "US",
      culture: "en-US",
    });

    expect(cloud.requests[0]?.url).toBe(
      "https://appapi.cp.dyson.com/v3/userregistration/email/verify?country=US",
    );
  });

  it("sends the user agent it is given", async () => {
    cloud.reply = () =>
      json({ account: "a-1", token: "abc", tokenType: "Bearer" });

    await login({ ...options, userAgent: "my-app/1.0" });

    expect(cloud.requests[0]?.headers).toMatchObject({
      "User-Agent": "my-app/1.0",
    });
    // The user agent is no field of the login.
    expect(cloud.requests[0]?.body).not.toHaveProperty("userAgent");
  });

  it("rejects with the cloud's status for a login it refuses", async () => {
    cloud.reply = () => json({ Message: "Unable to authenticate user." }, 401);

    await expect(login(options)).rejects.toEqual(
      new DysonError(
        "Dyson request to /v3/userregistration/email/verify failed",
        401,
      ),
    );
  });

  it("asks once, even after a connection the cloud resets", async () => {
    cloud.reply = reset;

    await expect(login(options)).rejects.toMatchObject({
      httpStatusCode: 503,
    });

    expect(cloud.requests).toHaveLength(1);
  });
});

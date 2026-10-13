import { describe, expect, it } from "vitest";
import { DysonError } from "../../error.js";
import { login, requestLoginCode } from "../login.js";
import { ACCOUNT, json, useMockCloud } from "./mocks/cloud.js";

const cloud = useMockCloud();

describe("requestLoginCode", () => {
  it("posts the email address and resolves with the challengeId", async () => {
    cloud.reply = () => json({ challengeId: "c-1" });

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
        url: "https://appapi.cp.dyson.com/v3/userregistration/email/auth?country=GB&culture=en-GB",
        headers: {
          "User-Agent": "dyson-control",
          "Content-Type": "application/json",
        },
        body: { email: "me@example.com" },
      },
    ]);
    expect(cloud.requests[0]?.headers).not.toHaveProperty("Authorization");
  });

  it("sends the user agent it is given in place of its own", async () => {
    cloud.reply = () => json({ challengeId: "c-1" });

    await requestLoginCode({
      email: "me@example.com",
      country: "GB",
      culture: "en-GB",
      userAgent: "my-app/1.0",
    });

    expect(cloud.requests[0]?.headers).toMatchObject({
      "User-Agent": "my-app/1.0",
    });
  });

  it("asks the cloud for China for an account there", async () => {
    cloud.reply = () => json({ challengeId: "c-2" });

    await requestLoginCode({
      email: "me@example.com",
      country: "CN",
      culture: "zh-CN",
    });

    expect(cloud.requests[0]?.url).toBe(
      "https://appapi.cp.dyson.cn/v3/userregistration/email/auth?country=CN&culture=zh-CN",
    );
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
});

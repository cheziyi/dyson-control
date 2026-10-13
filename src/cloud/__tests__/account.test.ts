import { describe, expect, it } from "vitest";
import { DysonError } from "../../error.js";
import { logIn, requestLoginCode } from "../account.js";
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
          "X-Platform": "android",
          "X-App-Version": "6.4.26381",
          "User-Agent": "okhttp/4.12.0",
          "Content-Type": "application/json",
        },
        body: { email: "me@example.com" },
      },
    ]);
    expect(cloud.requests[0]?.headers).not.toHaveProperty("Authorization");
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

describe("logIn", () => {
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

    await expect(logIn(options)).resolves.toEqual(ACCOUNT);

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

  it("rejects with the cloud's status for a wrong password or code", async () => {
    cloud.reply = () => json({ Message: "Unable to authenticate user." }, 400);

    await expect(logIn(options)).rejects.toEqual(
      new DysonError(
        "Dyson request to /v3/userregistration/email/verify failed",
        400,
      ),
    );
  });
});

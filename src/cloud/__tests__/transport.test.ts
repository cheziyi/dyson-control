import { describe, expect, it } from "vitest";
import { DysonConnectionError } from "../../error.js";
import { DysonCloudTransport } from "../transport.js";
import { useMockCloud } from "./mocks/cloud.js";

const cloud = useMockCloud();

describe("DysonCloudTransport", () => {
  const request = { method: "GET", path: "/v3/manifest" } as const;

  it("throws a DysonConnectionError for a connection the cloud resets", async () => {
    // What fetch throws: the socket's error is the cause of its own.
    cloud.reply = () => {
      throw new TypeError("fetch failed", {
        cause: Object.assign(new Error("reset"), { code: "ECONNRESET" }),
      });
    };

    await expect(
      new DysonCloudTransport({ country: "GB" }).send(request),
    ).rejects.toBeInstanceOf(DysonConnectionError);
  });

  it("throws status 504 for a request that fails to complete any other way", async () => {
    cloud.reply = () => {
      throw new TypeError("fetch failed", { cause: new Error("tls") });
    };

    await expect(
      new DysonCloudTransport({ country: "GB" }).send(request),
    ).rejects.toMatchObject({ name: "DysonError", httpStatusCode: 504 });
  });

  it("throws status 504 when the cloud does not answer in time", async () => {
    // As fetch does: it rejects once its signal aborts.
    cloud.reply = ({ signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason));
      });

    await expect(
      new DysonCloudTransport({ country: "GB", timeoutInMs: 10 }).send(request),
    ).rejects.toMatchObject({ name: "DysonError", httpStatusCode: 504 });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DysonConnectionError, DysonError } from "../../error.js";
import { DysonCloudTransport, withRetry } from "../transport.js";
import { reset, useMockCloud } from "./mocks/cloud.js";

const cloud = useMockCloud();

describe("DysonCloudTransport", () => {
  const request = { method: "GET", path: "/v3/manifest" } as const;

  it("throws a DysonConnectionError for a connection the cloud resets", async () => {
    cloud.reply = reset;

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

describe("withRetry", () => {
  const dropped = new DysonConnectionError("closed");

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the first result without running the operation again", async () => {
    const operation = vi.fn().mockResolvedValue("[]");

    await expect(withRetry(operation)).resolves.toBe("[]");

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("runs the operation again after a DysonConnectionError", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(dropped)
      .mockRejectedValueOnce(dropped)
      .mockResolvedValue("[]");

    const result = withRetry(operation);
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe("[]");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("retries at once, then after 50, 100, 200 and 400 ms", async () => {
    const startedAt = Date.now();
    const attemptTimesInMs: number[] = [];
    const operation = vi.fn(async () => {
      attemptTimesInMs.push(Date.now() - startedAt);
      throw dropped;
    });

    const result = withRetry(operation).catch((caught: unknown) => caught);
    await vi.runAllTimersAsync();
    await result;

    expect(attemptTimesInMs).toEqual([0, 0, 50, 150, 350, 750]);
  });

  it("throws the DysonConnectionError of the sixth attempt", async () => {
    const last = new DysonConnectionError("closed for the sixth time");
    const operation = vi.fn().mockRejectedValue(last);
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      operation.mockRejectedValueOnce(dropped);
    }

    const result = withRetry(operation).catch((caught: unknown) => caught);
    await vi.runAllTimersAsync();

    expect(await result).toBe(last);
    expect(operation).toHaveBeenCalledTimes(6);
  });

  it("throws any other error at once", async () => {
    const timedOut = new DysonError("timed out", 504);
    const operation = vi.fn().mockRejectedValue(timedOut);

    await expect(withRetry(operation)).rejects.toBe(timedOut);

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries once after each of delaysInMs", async () => {
    const startedAt = Date.now();
    const attemptTimesInMs: number[] = [];
    const operation = vi.fn(async () => {
      attemptTimesInMs.push(Date.now() - startedAt);
      throw dropped;
    });

    const result = withRetry(operation, { delaysInMs: [10, 1000] }).catch(
      (caught: unknown) => caught,
    );
    await vi.runAllTimersAsync();
    await result;

    expect(attemptTimesInMs).toEqual([0, 10, 1010]);
  });

  it("runs the operation once when delaysInMs is empty", async () => {
    const operation = vi.fn().mockRejectedValue(dropped);

    await expect(withRetry(operation, { delaysInMs: [] })).rejects.toBe(
      dropped,
    );

    expect(operation).toHaveBeenCalledTimes(1);
  });
});

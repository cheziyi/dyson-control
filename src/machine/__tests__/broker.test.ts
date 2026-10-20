import { EventEmitter } from "node:events";
import makeMulticastDns from "multicast-dns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DysonError } from "../../error.js";
import { findMachineBroker } from "../broker.js";

vi.mock("multicast-dns", () => ({ default: vi.fn() }));

const MACHINE = { serialNumber: "A1B-EU-ABC1234D" };

/** The LAN, in place of the mDNS library: it records each query, and a
 * test sends the responses. */
class MulticastDns extends EventEmitter {
  readonly queries: unknown[][] = [];
  destroyed = false;

  query(...query: unknown[]): void {
    this.queries.push(query);
  }

  destroy(): void {
    this.destroyed = true;
  }

  /** The response of a machine with the serial number, at the address. */
  answer(serialNumber: string, address: string): void {
    const instance = `897_${serialNumber}._dyson_mqtt._tcp.local`;
    this.emit("response", {
      answers: [
        { type: "PTR", name: "_dyson_mqtt._tcp.local", data: instance },
      ],
      additionals: [
        {
          type: "SRV",
          name: instance,
          data: { port: 1883, target: `${serialNumber}.local` },
        },
        { type: "A", name: `${serialNumber}.local`, data: address },
      ],
    });
  }
}

let multicastDns: MulticastDns;

beforeEach(() => {
  vi.useFakeTimers();
  multicastDns = new MulticastDns();
  vi.mocked(makeMulticastDns).mockReturnValue(
    multicastDns as unknown as ReturnType<typeof makeMulticastDns>,
  );
});

afterEach(() => {
  vi.useRealTimers();
});

function find(): Promise<unknown> {
  return findMachineBroker(MACHINE, "hash-1", "client-1");
}

describe("findMachineBroker", () => {
  it("resolves with the broker at the address the machine answers, and closes the socket", async () => {
    const broker = find();
    multicastDns.answer("A1B-EU-ABC1234D", "192.168.1.22");

    await expect(broker).resolves.toEqual({
      url: "mqtt://192.168.1.22:1883",
      clientId: "client-1",
      username: "A1B-EU-ABC1234D",
      password: "hash-1",
    });
    expect(multicastDns.queries).toEqual([["_dyson_mqtt._tcp.local", "PTR"]]);
    expect(multicastDns.destroyed).toBe(true);
  });

  it("asks again each second, and passes over another machine's answer", async () => {
    const broker = find();
    multicastDns.answer("Z9Z-EU-ZZZ9999Z", "192.168.1.23");
    await vi.advanceTimersByTimeAsync(2000);
    multicastDns.answer("A1B-EU-ABC1234D", "192.168.1.22");

    await expect(broker).resolves.toMatchObject({
      url: "mqtt://192.168.1.22:1883",
    });
    expect(multicastDns.queries).toHaveLength(3);
  });

  it("rejects with status 504 when the machine answers nothing in 3 seconds, and closes the socket", async () => {
    const broker = find();
    const rejected = expect(broker).rejects.toEqual(
      new DysonError("The machine answered no search on the LAN", 504),
    );
    await vi.advanceTimersByTimeAsync(3000);

    await rejected;
    expect(multicastDns.destroyed).toBe(true);
  });

  it("rejects with status 503 when the socket fails", async () => {
    const broker = find();
    multicastDns.emit("error", new Error("bind EADDRNOTAVAIL"));

    await expect(broker).rejects.toEqual(
      new DysonError(
        "Searching the LAN failed: Error: bind EADDRNOTAVAIL",
        503,
      ),
    );
    expect(multicastDns.destroyed).toBe(true);
  });
});

import type { ResponsePacket } from "multicast-dns";
import { describe, expect, it } from "vitest";
import { buildMachineBroker, parseMachineAddress } from "../broker.js";

const MACHINE = { serialNumber: "A1B-EU-ABC1234D" };

// What a 897 answers a query for its service, its NSEC records left out.
const RECORDS: ResponsePacket["answers"] = [
  {
    type: "PTR",
    name: "_dyson_mqtt._tcp.local",
    data: "897_A1B-EU-ABC1234D._dyson_mqtt._tcp.local",
  },
  {
    type: "SRV",
    name: "897_A1B-EU-ABC1234D._dyson_mqtt._tcp.local",
    data: {
      priority: 0,
      weight: 0,
      port: 1883,
      target: "A1B-EU-ABC1234D.local",
    },
  },
  {
    type: "TXT",
    name: "897_A1B-EU-ABC1234D._dyson_mqtt._tcp.local",
    data: [Buffer.from("Service for A1B-EU-ABC1234D")],
  },
  { type: "A", name: "A1B-EU-ABC1234D.local", data: "192.168.1.22" },
];

describe("buildMachineBroker", () => {
  it("logs in to the address as the serial number, with the password and the client id", () => {
    expect(
      buildMachineBroker(
        MACHINE,
        { host: "192.168.1.22", port: 1883 },
        "hash-1",
        "client-1",
      ),
    ).toEqual({
      url: "mqtt://192.168.1.22:1883",
      clientId: "client-1",
      username: "A1B-EU-ABC1234D",
      password: "hash-1",
    });
  });
});

describe("parseMachineAddress", () => {
  it("reads the A record of the target of the service named for the serial number, with the service's port", () => {
    expect(parseMachineAddress(RECORDS, MACHINE)).toEqual({
      host: "192.168.1.22",
      port: 1883,
    });
  });

  it("reads the service of the machine among another's", () => {
    const other: ResponsePacket["answers"] = [
      {
        type: "PTR",
        name: "_dyson_mqtt._tcp.local",
        data: "438_Z9Z-EU-ZZZ9999Z._dyson_mqtt._tcp.local",
      },
      {
        type: "SRV",
        name: "438_Z9Z-EU-ZZZ9999Z._dyson_mqtt._tcp.local",
        data: { port: 1883, target: "Z9Z-EU-ZZZ9999Z.local" },
      },
      { type: "A", name: "Z9Z-EU-ZZZ9999Z.local", data: "192.168.1.23" },
    ];

    expect(parseMachineAddress([...other, ...RECORDS], MACHINE)).toEqual({
      host: "192.168.1.22",
      port: 1883,
    });
  });

  it("reads nothing for another machine's service", () => {
    expect(
      parseMachineAddress(RECORDS, { serialNumber: "BC1234D" }),
    ).toBeUndefined();
  });

  it.each(["PTR", "SRV", "A"])(
    "reads nothing without the %s record",
    (type) => {
      expect(
        parseMachineAddress(
          RECORDS.filter((record) => record.type !== type),
          MACHINE,
        ),
      ).toBeUndefined();
    },
  );
});

import type { ResponsePacket } from "multicast-dns";
import type { DysonBroker } from "../../cloud/connection.js";
import type { DysonMachine } from "../../cloud/models/machine.js";
import { MACHINE_SERVICE_TYPE } from "./tables.js";

type DnsRecord = ResponsePacket["answers"][number];

/** Where the machine's own broker listens on the LAN. */
export interface MachineAddress {
  host: string;
  port: number;
}

/** The machine's own broker at `address`, which takes its serial number as
 * the username and a client id of 1 to 23 characters. */
export function buildMachineBroker(
  machine: Pick<DysonMachine, "serialNumber">,
  address: MachineAddress,
  apPasswordHash: string,
  clientId: string,
): DysonBroker {
  return {
    url: `mqtt://${address.host}:${address.port}`,
    clientId,
    username: machine.serialNumber,
    password: apPasswordHash,
  };
}

/** The IPv4 address and port of the machine's own broker, from the mDNS
 * records of one response: the instance of `MACHINE_SERVICE_TYPE` named for
 * its serial number, that instance's SRV record, and the A record of the
 * SRV's target. `undefined` when the records lack any of the three. */
export function parseMachineAddress(
  records: readonly DnsRecord[],
  machine: Pick<DysonMachine, "serialNumber">,
): MachineAddress | undefined {
  const suffix = `_${machine.serialNumber}.${MACHINE_SERVICE_TYPE}`;
  const instances = records.flatMap((record) =>
    record.type === "PTR" &&
    record.name === MACHINE_SERVICE_TYPE &&
    record.data.endsWith(suffix)
      ? [record.data]
      : [],
  );
  const service = records.find(
    (record) => record.type === "SRV" && instances.includes(record.name),
  );
  if (service?.type !== "SRV") {
    return undefined;
  }
  const address = records.find(
    (record) => record.type === "A" && record.name === service.data.target,
  );
  return address?.type === "A"
    ? { host: address.data, port: service.data.port }
    : undefined;
}

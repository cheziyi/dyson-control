import type { DysonBroker } from "../../cloud/connection.js";
import type { DysonMachine } from "../../cloud/models/machine.js";
import { MACHINE_BROKER_PORT } from "./tables.js";

/** The machine's own broker at `host`, which takes its serial number as the
 * username and a client id of 1 to 23 characters. */
export function buildMachineBroker(
  machine: Pick<DysonMachine, "serialNumber">,
  host: string,
  apPasswordHash: string,
  clientId: string,
): DysonBroker {
  return {
    url: `mqtt://${host}:${MACHINE_BROKER_PORT}`,
    clientId,
    username: machine.serialNumber,
    password: apPasswordHash,
  };
}

import makeMulticastDns from "multicast-dns";
import type { DysonBroker } from "../cloud/connection.js";
import type { DysonMachine } from "../cloud/models/machine.js";
import { DysonError } from "../error.js";
import {
  buildMachineBroker,
  type MachineAddress,
  parseMachineAddress,
} from "./protocol/broker.js";
import { MACHINE_SERVICE_TYPE } from "./protocol/tables.js";

// A machine misses a query now and then, and a querier asks again no sooner
// than a second after its first: RFC 6762, section 5.2.
const QUERY_INTERVAL_IN_MS = 1000;

// A machine on the LAN answered 19 of 20 searches within 2.2 seconds. A
// machine that is not there costs this long before the cloud's broker.
const SEARCH_TIMEOUT_IN_MS = 3000;

/** Searches the LAN over mDNS for the machine's own broker, asking each
 * second, and resolves with it once the machine answers.
 *
 * It rejects with a `DysonError` with status 504 when the machine answers
 * nothing in 3 seconds, and 503 when the socket fails. */
export async function findMachineBroker(
  machine: Pick<DysonMachine, "serialNumber">,
  apPasswordHash: string,
  clientId: string,
): Promise<DysonBroker> {
  const multicastDns = makeMulticastDns();
  const ask = () => multicastDns.query(MACHINE_SERVICE_TYPE, "PTR");
  const asking = setInterval(ask, QUERY_INTERVAL_IN_MS);
  let timeout: NodeJS.Timeout | undefined;
  try {
    const address = await new Promise<MachineAddress>((resolve, reject) => {
      timeout = setTimeout(() => {
        reject(
          new DysonError("The machine answered no search on the LAN", 504),
        );
      }, SEARCH_TIMEOUT_IN_MS);
      multicastDns.on("response", (response) => {
        const found = parseMachineAddress(
          [...response.answers, ...response.additionals],
          machine,
        );
        if (found !== undefined) {
          resolve(found);
        }
      });
      multicastDns.on("error", (error) => {
        reject(
          new DysonError(`Searching the LAN failed: ${String(error)}`, 503),
        );
      });
      ask();
    });
    return buildMachineBroker(machine, address, apPasswordHash, clientId);
  } finally {
    clearInterval(asking);
    clearTimeout(timeout);
    multicastDns.destroy();
  }
}

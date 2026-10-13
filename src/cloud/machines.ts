import type { DysonAccount } from "./models/account.js";
import type { DysonMachine } from "./models/machine.js";
import { parseMachines } from "./protocol/machine.js";
import { CLOUD_ROUTES } from "./protocol/tables.js";
import { type DysonCloudOptions, DysonCloudTransport } from "./transport.js";

/** The account's machines that the broker reaches, of every category:
 * check `category` before building a client for one. It rejects with a
 * `DysonError` when the request fails, with status 401 for a token the cloud
 * no longer accepts. */
export async function getMachines(
  account: DysonAccount,
  options: DysonCloudOptions = {},
): Promise<DysonMachine[]> {
  return parseMachines(
    await new DysonCloudTransport({
      country: account.country,
      account,
      timeoutInMs: options.timeoutInMs,
    }).send({
      method: "GET",
      path: CLOUD_ROUTES.manifest,
      query: { market: account.country, locale: account.culture },
    }),
  );
}

import type { DysonAccount } from "./models/account.js";
import type { DysonMachine } from "./models/machine.js";
import { buildManifestQuery, parseMachines } from "./protocol/machines.js";
import { CLOUD_ROUTES } from "./protocol/tables.js";
import {
  DysonCloudTransport,
  type DysonRetryOptions,
  withRetry,
} from "./transport.js";

export interface GetMachinesOptions {
  /** How long, in milliseconds, the request waits for the cloud. Defaults to
   * 10000: see `DysonCloudTransportOptions.timeoutInMs`. */
  timeoutInMs?: number;
  /** Sent as the `User-Agent` of each request. Defaults to `dyson-control`:
   * see `DysonCloudTransportOptions.userAgent`. */
  userAgent?: string;
  /** The waits between retries of a refused or dropped connection. Defaults
   * to 0, 50, 100, 200 and 400 ms: see `DysonRetryOptions.delaysInMs`. */
  retry?: DysonRetryOptions;
}

/** The account's machines that the broker reaches, of every category:
 * check `category` before building a client for one. It rejects with a
 * `DysonError` when the request fails, with status 401 for a token the cloud
 * no longer accepts. */
export async function getMachines(
  account: DysonAccount,
  options: GetMachinesOptions = {},
): Promise<DysonMachine[]> {
  const transport = new DysonCloudTransport({
    country: account.country,
    account,
    timeoutInMs: options.timeoutInMs,
    userAgent: options.userAgent,
  });
  return parseMachines(
    await withRetry(
      () =>
        transport.send({
          method: "GET",
          path: CLOUD_ROUTES.manifest,
          query: buildManifestQuery(account),
        }),
      options.retry,
    ),
  );
}

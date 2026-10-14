import { parseCountries } from "./protocol/countries.js";
import { CLOUD_ROUTES } from "./protocol/tables.js";
import {
  DysonCloudTransport,
  type DysonRetryOptions,
  withRetry,
} from "./transport.js";

export interface GetCountriesOptions {
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

/** The countries the cloud registers accounts in, each as two capital
 * letters, such as `GB`: pass one as `country`. It asks the global cloud, and
 * takes no account. It rejects with a `DysonError` when the request fails. */
export async function getCountries(
  options: GetCountriesOptions = {},
): Promise<string[]> {
  const transport = new DysonCloudTransport(options);
  return parseCountries(
    await withRetry(
      () =>
        transport.send({ method: "GET", path: CLOUD_ROUTES.supportedMarket }),
      options.retry,
    ),
  );
}

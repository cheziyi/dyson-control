import { parseCountries } from "./protocol/countries.js";
import { CLOUD_ROUTES } from "./protocol/tables.js";
import { DysonCloudTransport } from "./transport.js";

export interface GetCountriesOptions {
  /** How long, in milliseconds, the request waits for the cloud. Defaults to
   * 10000: see `DysonCloudTransportOptions.timeoutInMs`. */
  timeoutInMs?: number;
  /** Sent as the `User-Agent` of each request. Defaults to `dyson-control`:
   * see `DysonCloudTransportOptions.userAgent`. */
  userAgent?: string;
}

/** The countries the cloud registers accounts in, each as two capital
 * letters, such as `GB`: pass one as `country`. It asks the global cloud, and
 * takes no account. It rejects with a `DysonError` when the request fails. */
export async function getCountries(
  options: GetCountriesOptions = {},
): Promise<string[]> {
  return parseCountries(
    await new DysonCloudTransport(options).send({
      method: "GET",
      path: CLOUD_ROUTES.supportedMarket,
    }),
  );
}

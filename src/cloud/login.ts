import type { DysonAccount, DysonRegion } from "./models/account.js";
import {
  buildLoginCodeRequest,
  buildLoginRequest,
  type LoginCredentials,
  parseLoginCodeReply,
  parseLoginReply,
} from "./protocol/account.js";
import { CLOUD_ROUTES } from "./protocol/tables.js";
import { DysonCloudTransport } from "./transport.js";

/** The global cloud logs an account in under a country other than its own,
 * so only an account in `CN` has one to pick. */
export const DEFAULT_COUNTRY = "US";

/** The manifest answers the same for any culture, so few callers have one
 * to pick. */
export const DEFAULT_CULTURE = "en-US";

function withDefaults(region: DysonRegion): Required<DysonRegion> {
  return {
    country: region.country ?? DEFAULT_COUNTRY,
    culture: region.culture ?? DEFAULT_CULTURE,
  };
}

export interface RequestLoginCodeOptions extends DysonRegion {
  email: string;
  /** How long, in milliseconds, the request waits for the cloud. Defaults to
   * 10000: see `DysonCloudTransportOptions.timeoutInMs`. */
  timeoutInMs?: number;
  /** Sent as the `User-Agent` of each request. Defaults to `dyson-control`:
   * see `DysonCloudTransportOptions.userAgent`. */
  userAgent?: string;
}

/** Has the cloud email a login code to the account's address, and resolves
 * with the `challengeId` to pass to `login` with that code. It rejects with
 * a `DysonError` when the request fails. */
export async function requestLoginCode(
  options: RequestLoginCodeOptions,
): Promise<string> {
  return parseLoginCodeReply(
    await new DysonCloudTransport(options).send({
      method: "POST",
      path: CLOUD_ROUTES.loginCode,
      query: withDefaults(options),
      jsonBody: buildLoginCodeRequest(options.email),
    }),
  );
}

export interface LoginOptions extends DysonRegion, LoginCredentials {
  /** How long, in milliseconds, the request waits for the cloud. Defaults to
   * 10000: see `DysonCloudTransportOptions.timeoutInMs`. */
  timeoutInMs?: number;
  /** Sent as the `User-Agent` of each request. Defaults to `dyson-control`:
   * see `DysonCloudTransportOptions.userAgent`. */
  userAgent?: string;
}

/** Logs in with the account's password and the emailed code, and resolves
 * with the account to store. Pass the `country` and `culture`
 * `requestLoginCode` was given. It rejects with a `DysonError` when the
 * request fails, as it does for a wrong password or code. */
export async function login(options: LoginOptions): Promise<DysonAccount> {
  const region = withDefaults(options);
  return parseLoginReply(
    await new DysonCloudTransport(options).send({
      method: "POST",
      path: CLOUD_ROUTES.login,
      query: { country: region.country },
      jsonBody: buildLoginRequest(options),
    }),
    region,
  );
}

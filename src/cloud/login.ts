import type {
  DysonAccount,
  DysonRegion,
  LoginCredentials,
} from "./models/account.js";
import {
  buildLoginCodeRequest,
  buildLoginRequest,
  buildUserStatusRequest,
  parseLoginCodeReply,
  parseLoginReply,
  parseUserStatusReply,
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

/** Asks the cloud for the account's status, then has it email a login code
 * to the account's address, and resolves with the `challengeId` to pass to
 * `login` with that code. It rejects with a `DysonError` when a request
 * fails, with status 401 for an address the cloud emails no code for, and
 * never retries: see DESIGN.md#retries. */
export async function requestLoginCode(
  options: RequestLoginCodeOptions,
): Promise<string> {
  const region = withDefaults(options);
  const transport = new DysonCloudTransport(options);
  // The cloud refuses the code with HTTP 401 for an account whose status it
  // was not asked for first: see DESIGN.md#a-login-code-after-the-user-status.
  parseUserStatusReply(
    await transport.send({
      method: "POST",
      path: CLOUD_ROUTES.userStatus,
      query: { country: region.country },
      jsonBody: buildUserStatusRequest(options.email),
    }),
  );
  return parseLoginCodeReply(
    await transport.send({
      method: "POST",
      path: CLOUD_ROUTES.loginCode,
      query: region,
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
 * request fails, as it does for a wrong password or code, and never
 * retries: see DESIGN.md#retries. */
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

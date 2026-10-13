import type { DysonAccount, DysonRegion } from "./models/account.js";
import {
  buildLogInRequest,
  buildLoginCodeRequest,
  type LogInCredentials,
  parseLogInReply,
  parseLoginCodeReply,
} from "./protocol/account.js";
import { CLOUD_ROUTES } from "./protocol/tables.js";
import { type DysonCloudOptions, DysonCloudTransport } from "./transport.js";

export interface RequestLoginCodeOptions
  extends DysonRegion,
    DysonCloudOptions {
  email: string;
}

/** Has the cloud email a login code to the account's address, and resolves
 * with the `challengeId` to pass to `logIn` with that code. It rejects with
 * a `DysonError` when the request fails. */
export async function requestLoginCode(
  options: RequestLoginCodeOptions,
): Promise<string> {
  return parseLoginCodeReply(
    await new DysonCloudTransport(options).send({
      method: "POST",
      path: CLOUD_ROUTES.loginCode,
      query: { country: options.country, culture: options.culture },
      jsonBody: buildLoginCodeRequest(options.email),
    }),
  );
}

export interface LogInOptions
  extends DysonRegion,
    DysonCloudOptions,
    LogInCredentials {}

/** Logs in with the account's password and the emailed code, and resolves
 * with the account to store. Pass the `country` and `culture`
 * `requestLoginCode` was given. It rejects with a `DysonError` when the
 * request fails, as it does for a wrong password or code. */
export async function logIn(options: LogInOptions): Promise<DysonAccount> {
  return parseLogInReply(
    await new DysonCloudTransport(options).send({
      method: "POST",
      path: CLOUD_ROUTES.logIn,
      query: { country: options.country },
      jsonBody: buildLogInRequest(options),
    }),
    options,
  );
}

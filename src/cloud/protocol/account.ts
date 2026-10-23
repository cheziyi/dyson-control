import { DysonError } from "../../error.js";
import type {
  DysonAccount,
  DysonRegion,
  LoginCredentials,
} from "../models/account.js";
import {
  CLOUD_ACTIVE_ACCOUNT_STATUS,
  CLOUD_AUTHENTICATION_METHODS,
  CLOUD_CHINA_COUNTRY,
  CLOUD_ORIGINS,
  CLOUD_QUERY_PARAMETERS,
} from "./tables.js";

/** How an account logs in: with a code the cloud emails, or with its
 * password alone. */
export type LoginMethod = keyof typeof CLOUD_AUTHENTICATION_METHODS;

/** The cloud an account's requests go to, or the global one for no
 * country. */
export function encodeCloudOrigin(country?: string): string {
  return country === CLOUD_CHINA_COUNTRY
    ? CLOUD_ORIGINS.china
    : CLOUD_ORIGINS.global;
}

/** The header every request carries. The cloud answers HTTP 403 to a request
 * without one, or with an empty one, and takes any other value. */
export function encodeUserAgent(userAgent: string): Record<string, string> {
  return { "User-Agent": userAgent };
}

/** The header that carries an account's token. */
export function encodeAccountToken(
  account: Pick<DysonAccount, "token" | "tokenType">,
): Record<string, string> {
  return { Authorization: `${account.tokenType} ${account.token}` };
}

/** The query of the user status and the login routes. */
export function buildCountryQuery(
  region: Pick<Required<DysonRegion>, "country">,
): Record<string, string> {
  return { [CLOUD_QUERY_PARAMETERS.country]: region.country };
}

/** The query of the login code route, which takes the culture as well. */
export function buildRegionQuery(
  region: Required<DysonRegion>,
): Record<string, string> {
  return {
    [CLOUD_QUERY_PARAMETERS.country]: region.country,
    [CLOUD_QUERY_PARAMETERS.culture]: region.culture,
  };
}

export function buildUserStatusRequest(email: string): unknown {
  return { email };
}

/** How the account logs in. It throws a `DysonError` with status 401 for a
 * user status the cloud logs no account in for: an `accountStatus` of
 * `UNREGISTERED` or `NEEDS_ACTIVATION`, or an `authenticationMethod` outside
 * `CLOUD_AUTHENTICATION_METHODS`. */
export function parseUserStatusReply(text: string): LoginMethod {
  const { accountStatus, authenticationMethod } = parseCloudReply(text);
  if (typeof accountStatus !== "string") {
    throw new DysonError("The Dyson cloud sent no accountStatus", 502);
  }
  if (typeof authenticationMethod !== "string") {
    throw new DysonError("The Dyson cloud sent no authenticationMethod", 502);
  }
  if (accountStatus !== CLOUD_ACTIVE_ACCOUNT_STATUS) {
    throw new DysonError(
      `The Dyson cloud logs in no account with an accountStatus of ${accountStatus}`,
      401,
    );
  }
  const method = (
    Object.keys(CLOUD_AUTHENTICATION_METHODS) as LoginMethod[]
  ).find((each) =>
    (CLOUD_AUTHENTICATION_METHODS[each] as readonly string[]).includes(
      authenticationMethod,
    ),
  );
  if (method === undefined) {
    throw new DysonError(
      `The Dyson cloud logs in no account with an authenticationMethod of ${authenticationMethod}`,
      401,
    );
  }
  return method;
}

export function buildLoginCodeRequest(email: string): unknown {
  return { email };
}

/** The `challengeId` of a reply to a request for a login code. */
export function parseLoginCodeReply(text: string): string {
  const { challengeId } = parseCloudReply(text);
  if (typeof challengeId !== "string") {
    throw new DysonError("The Dyson cloud sent no challengeId", 502);
  }
  return challengeId;
}

/** The body of a login: the password with the code, or the password alone
 * for an account that logs in without one. */
export function buildLoginRequest(credentials: LoginCredentials): unknown {
  const { email, password, challengeId, otpCode } = credentials;
  return challengeId === undefined
    ? { email, password }
    : { email, password, challengeId, otpCode };
}

export function parseLoginReply(
  text: string,
  region: Required<DysonRegion>,
): DysonAccount {
  const { account, token, tokenType } = parseCloudReply(text);
  if (
    typeof account !== "string" ||
    typeof token !== "string" ||
    typeof tokenType !== "string"
  ) {
    throw new DysonError("The Dyson cloud sent no token", 502);
  }
  return {
    country: region.country,
    culture: region.culture,
    accountId: account,
    token,
    tokenType,
  };
}

/** A reply's JSON object. It throws a `DysonError` with status 502 for a
 * reply that is not one. */
export function parseCloudReply(text: string): Record<string, unknown> {
  let reply: unknown;
  try {
    reply = JSON.parse(text);
  } catch {
    reply = undefined;
  }
  if (typeof reply !== "object" || reply === null || Array.isArray(reply)) {
    throw new DysonError("The Dyson cloud sent a reply that is no object", 502);
  }
  return reply as Record<string, unknown>;
}

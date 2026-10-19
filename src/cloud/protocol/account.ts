import { DysonError } from "../../error.js";
import type {
  DysonAccount,
  DysonRegion,
  LoginCredentials,
} from "../models/account.js";
import {
  CLOUD_CHINA_COUNTRY,
  CLOUD_LOGIN_CODE_USER_STATUS,
  CLOUD_ORIGINS,
} from "./tables.js";

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

export function buildUserStatusRequest(email: string): unknown {
  return { email };
}

/** Throws a `DysonError` with status 401 for a user status the cloud emails
 * no login code for: an `accountStatus` of `UNREGISTERED` or
 * `NEEDS_ACTIVATION`, or an `authenticationMethod` of `EMAIL_PASSWORD`. */
export function parseUserStatusReply(text: string): void {
  const { accountStatus, authenticationMethod } = parseCloudReply(text);
  if (typeof accountStatus !== "string") {
    throw new DysonError("The Dyson cloud sent no accountStatus", 502);
  }
  if (typeof authenticationMethod !== "string") {
    throw new DysonError("The Dyson cloud sent no authenticationMethod", 502);
  }
  if (accountStatus !== CLOUD_LOGIN_CODE_USER_STATUS.accountStatus) {
    throw new DysonError(
      `The Dyson cloud emails no login code for an accountStatus of ${accountStatus}`,
      401,
    );
  }
  if (
    authenticationMethod !== CLOUD_LOGIN_CODE_USER_STATUS.authenticationMethod
  ) {
    throw new DysonError(
      `The Dyson cloud emails no login code for an authenticationMethod of ${authenticationMethod}`,
      401,
    );
  }
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

export function buildLoginRequest(credentials: LoginCredentials): unknown {
  return {
    email: credentials.email,
    password: credentials.password,
    challengeId: credentials.challengeId,
    otpCode: credentials.otpCode,
  };
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

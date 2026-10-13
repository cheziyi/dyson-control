import { DysonError } from "../../error.js";
import type { DysonAccount, DysonRegion } from "../models/account.js";
import { CLOUD_CHINA_COUNTRY, CLOUD_ORIGINS } from "./tables.js";

/** The cloud an account's requests go to. */
export function encodeCloudOrigin(country: string): string {
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

export interface LoginCredentials {
  email: string;
  password: string;
  /** What `parseLoginCodeReply` returned for the code. */
  challengeId: string;
  /** The code the cloud emailed. */
  otpCode: string;
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
  region: DysonRegion,
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

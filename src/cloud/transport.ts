import { DysonConnectionError, DysonError } from "../error.js";
import type { DysonAccount } from "./models/account.js";
import { encodeAccountToken, encodeCloudOrigin } from "./protocol/account.js";
import { CLOUD_HEADERS } from "./protocol/tables.js";

export const DEFAULT_TIMEOUT_IN_MS = 10_000;

// The codes for a refused, reset or closed connection, as `fetch` reports
// them on the `cause` of what it throws. Every other failure, such as a
// timeout or a TLS error, is not one.
const CONNECTION_FAILURE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "UND_ERR_SOCKET",
]);

export interface DysonCloudRequest {
  method: "GET" | "POST";
  /** From the leading `/`, without a query string. */
  path: string;
  /** Unencoded: `send` percent-encodes each key and value. */
  query?: Record<string, string>;
  jsonBody?: unknown;
}

/** What every call to the cloud takes. */
export interface DysonCloudOptions {
  /** How long, in milliseconds, a request waits for the cloud. Defaults to
   * 10000: see `DysonCloudTransportOptions.timeoutInMs`. */
  timeoutInMs?: number;
}

export interface DysonCloudTransportOptions {
  /** The account's country, which picks the cloud: see
   * `DysonRegion.country`. */
  country: string;
  /** Sends the account's token on every request. Left out for the two login
   * requests, which take none. */
  account?: Pick<DysonAccount, "token" | "tokenType">;
  /** How long, in milliseconds, to wait for the whole reply before `send`
   * throws a `DysonError` with status 504. Defaults to 10000. */
  timeoutInMs?: number;
}

/** The HTTPS requests to the Dyson cloud of one country. It holds no
 * connection of its own, so there is nothing to close. */
export class DysonCloudTransport {
  private readonly origin: string;

  constructor(private readonly options: DysonCloudTransportOptions) {
    this.origin = encodeCloudOrigin(options.country);
  }

  /** Sends one request and returns the reply's body as text.
   *
   * It throws a `DysonConnectionError` when the cloud refuses, resets or
   * closes the connection, and a `DysonError` with status 504 when the
   * request fails to complete any other way, such as a timeout. A reply
   * whose status is not 2xx makes it throw a `DysonError` with that
   * status. */
  async send(cloudRequest: DysonCloudRequest): Promise<string> {
    const url = new URL(cloudRequest.path, this.origin);
    for (const [key, value] of Object.entries(cloudRequest.query ?? {})) {
      url.searchParams.set(key, value);
    }
    const timeoutInMs = this.options.timeoutInMs ?? DEFAULT_TIMEOUT_IN_MS;

    let response: Response;
    let text: string;
    try {
      response = await fetch(url, {
        method: cloudRequest.method,
        headers: {
          ...CLOUD_HEADERS,
          ...(this.options.account === undefined
            ? {}
            : encodeAccountToken(this.options.account)),
          ...(cloudRequest.jsonBody === undefined
            ? {}
            : { "Content-Type": "application/json" }),
        },
        ...(cloudRequest.jsonBody === undefined
          ? {}
          : { body: JSON.stringify(cloudRequest.jsonBody) }),
        signal: AbortSignal.timeout(timeoutInMs),
      });
      text = await response.text();
    } catch (error) {
      const message = `Dyson request to ${cloudRequest.path} did not complete: ${String(error)}`;
      const { cause } = error as { cause?: NodeJS.ErrnoException };
      if (CONNECTION_FAILURE_CODES.has(cause?.code ?? "")) {
        throw new DysonConnectionError(message);
      }
      throw new DysonError(message, 504);
    }

    if (!response.ok) {
      throw new DysonError(
        `Dyson request to ${cloudRequest.path} failed`,
        response.status,
      );
    }
    return text;
  }
}

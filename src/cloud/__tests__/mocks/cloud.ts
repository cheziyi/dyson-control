import { afterEach, beforeEach, vi } from "vitest";

export const GLOBAL_ORIGIN = "https://appapi.cp.dyson.com";
export const CHINA_ORIGIN = "https://appapi.cp.dyson.cn";

export const ACCOUNT = {
  country: "GB",
  culture: "en-GB",
  accountId: "a-1",
  token: "abc",
  tokenType: "Bearer",
};

export interface CloudRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  /** The JSON body, parsed, or `undefined` for a request without one. */
  body: unknown;
  signal: AbortSignal;
}

export interface MockCloud {
  /** What was sent, in order. */
  requests: CloudRequest[];
  /** Answers each request, and may throw as `fetch` does. */
  reply: (request: CloudRequest) => Response | Promise<Response>;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/** Puts a mock in place of `fetch` for each test of the file, so no request
 * leaves this computer. Set `reply` inside a test to answer its requests. */
export function useMockCloud(): MockCloud {
  const mock: MockCloud = { requests: [], reply: () => json({}, 404) };

  beforeEach(() => {
    mock.requests = [];
    mock.reply = () => json({}, 404);
    vi.stubGlobal("fetch", async (url: URL, init: RequestInit) => {
      const request: CloudRequest = {
        method: init.method ?? "GET",
        url: String(url),
        headers: init.headers as Record<string, string>,
        body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
        signal: init.signal as AbortSignal,
      };
      mock.requests.push(request);
      return mock.reply(request);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  return mock;
}

import { DysonError } from "../../error.js";

/** The countries of the cloud's list of supported markets. It throws a
 * `DysonError` with status 502 for a reply that is no list of them. */
export function parseCountries(text: string): string[] {
  let reply: unknown;
  try {
    reply = JSON.parse(text);
  } catch {
    reply = undefined;
  }
  if (
    !Array.isArray(reply) ||
    !reply.every((each) => typeof each === "string")
  ) {
    throw new DysonError(
      "The Dyson cloud sent supported markets that are no list",
      502,
    );
  }
  return reply;
}

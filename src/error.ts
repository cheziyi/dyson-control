export class DysonError extends Error {
  constructor(
    message: string,
    /** The cloud's own HTTP status, or the status this package gives a
     * failure that has none: the README's "Errors and retries" lists them. */
    readonly httpStatusCode: number,
  ) {
    super(message);
    this.name = "DysonError";
  }
}

/** The cloud or its broker refused or dropped the connection. The only
 * failure `withRetry` repeats: see DESIGN.md#retries. */
export class DysonConnectionError extends DysonError {
  constructor(message: string) {
    super(message, 503);
    this.name = "DysonConnectionError";
  }
}

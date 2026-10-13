/** Where a Dyson account is registered. It picks the cloud a request goes to,
 * and the cloud takes both values on its login and manifest requests. */
export interface DysonRegion {
  /** The account's country, as two capital letters, such as `GB`. `CN` goes
   * to the cloud for mainland China, and every other country to the global
   * one. */
  country: string;
  /** A language and a country joined by a dash, such as `en-GB`. */
  culture: string;
}

/** A logged-in Dyson account, as `logIn` resolves with it. Store it and pass
 * it to `getMachines` and to a client: it holds no password. */
export interface DysonAccount extends DysonRegion {
  /** The cloud's own identifier of the account. */
  accountId: string;
  /** Sent to the cloud after `tokenType` on every request. How long the
   * cloud accepts it is not known: see UNSUPPORTED.md. */
  token: string;
  /** Such as `Bearer`. */
  tokenType: string;
}

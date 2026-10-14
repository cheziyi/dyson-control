/** Where a Dyson account is registered. It picks the cloud a request goes to,
 * and the cloud takes both values on its login and manifest requests. */
export interface DysonRegion {
  /** The account's country, as two capital letters, such as `GB`: one of
   * those `getCountries` resolves with. Defaults to `US`. Pass `CN` for an
   * account in mainland China, which goes to a cloud of its own: the global
   * cloud takes every other country, and logs an account in under a country
   * other than its own. */
  country?: string;
  /** A language and a country joined by a dash, such as `en-GB`. Defaults to
   * `en-US`. */
  culture?: string;
}

/** What `login` takes to log an account in. */
export interface LoginCredentials {
  email: string;
  password: string;
  /** What `requestLoginCode` resolved with. */
  challengeId: string;
  /** The code the cloud emailed. */
  otpCode: string;
}

/** A logged-in Dyson account, as `login` resolves with it. Store it and pass
 * it to `getMachines` and to a client: it holds no password. */
export interface DysonAccount extends DysonRegion {
  /** The country `login` was given, or `US`. */
  country: string;
  /** The culture `login` was given, or `en-US`. */
  culture: string;
  /** The cloud's own identifier of the account. */
  accountId: string;
  /** Sent to the cloud after `tokenType` on every request. How long the
   * cloud accepts it is not known: see UNSUPPORTED.md. */
  token: string;
  /** Such as `Bearer`. */
  tokenType: string;
}

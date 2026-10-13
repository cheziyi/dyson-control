import { describe, expect, it } from "vitest";
import { parseCountries } from "../countries.js";

describe("parseCountries", () => {
  it("reads the countries", () => {
    expect(parseCountries('["GB","US","CN"]')).toEqual(["GB", "US", "CN"]);
  });

  it.each(["not json", "{}", "null", '["GB",3]'])(
    "throws status 502 for %s",
    (text) => {
      expect(() => parseCountries(text)).toThrow(
        expect.objectContaining({ httpStatusCode: 502 }),
      );
    },
  );
});

import { describe, expect, it } from "vitest";
import { decodeEnvironmentalCareType } from "../type.js";

describe("decodeEnvironmentalCareType", () => {
  it.each(["455", "455C", "469", "475"])(
    "reads %s as a type of the first generation",
    (type) => {
      expect(decodeEnvironmentalCareType(type)).toEqual({ generation1: true });
    },
  );

  it.each(["438", "438E", "527K", "358", "635", "664", "960", "1018"])(
    "reads %s as a later type",
    (type) => {
      expect(decodeEnvironmentalCareType(type)).toEqual({
        generation1: false,
      });
    },
  );

  it.each(["276", "N223", "552", ""])("answers undefined for %s", (type) => {
    expect(decodeEnvironmentalCareType(type)).toBeUndefined();
  });
});

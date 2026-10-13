import { describe, expect, it } from "vitest";
import { decodeEnvironmentalCareType } from "../type.js";

describe("decodeEnvironmentalCareType", () => {
  it.each(["455", "455C", "469", "475"])(
    "reads %s as a type of the first generation",
    (type) => {
      expect(decodeEnvironmentalCareType(type)).toEqual({
        generation1: true,
        hasAutoMode: true,
      });
    },
  );

  it.each(["438", "438E", "527K", "358", "664", "1018"])(
    "reads %s as a later type with an auto mode",
    (type) => {
      expect(decodeEnvironmentalCareType(type)).toEqual({
        generation1: false,
        hasAutoMode: true,
      });
    },
  );

  it.each(["635", "739", "949", "960"])(
    "reads %s as a later type without an auto mode",
    (type) => {
      expect(decodeEnvironmentalCareType(type)).toEqual({
        generation1: false,
        hasAutoMode: false,
      });
    },
  );

  it.each(["276", "N223", "552", ""])("answers undefined for %s", (type) => {
    expect(decodeEnvironmentalCareType(type)).toBeUndefined();
  });
});

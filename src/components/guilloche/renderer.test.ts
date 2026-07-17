import { describe, it, expect } from "vitest";
import { parseHex } from "./renderer";

describe("parseHex", () => {
  it("normalizes a six-digit hex", () => {
    expect(parseHex("#ffffff")).toEqual([1, 1, 1]);
    expect(parseHex("#000000")).toEqual([0, 0, 0]);
  });

  it("accepts the whitespace getPropertyValue returns", () => {
    expect(parseHex("  #070a11 ")).toEqual([7 / 255, 10 / 255, 17 / 255]);
  });

  it("accepts a missing leading hash and mixed case", () => {
    expect(parseHex("5EEAD4")).toEqual([94 / 255, 234 / 255, 212 / 255]);
  });

  it("returns null for values it cannot read, so callers fall back", () => {
    // A theme var could legitimately be shorthand, a color function, or unset.
    expect(parseHex("")).toBeNull();
    expect(parseHex("#fff")).toBeNull();
    expect(parseHex("oklch(0.7 0.1 200)")).toBeNull();
    expect(parseHex("#gggggg")).toBeNull();
  });
});

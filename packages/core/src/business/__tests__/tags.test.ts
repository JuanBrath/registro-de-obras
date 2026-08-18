import { describe, expect, it } from "vitest";
import { formatTags, parseTags } from "../tags.js";

describe("parseTags", () => {
  it("splits comma-separated tags and trims whitespace", () => {
    expect(parseTags("paisaje, retrato ,  blanco y negro")).toEqual(["paisaje", "retrato", "blanco y negro"]);
  });

  it("returns an empty array for null/undefined/empty", () => {
    expect(parseTags(null)).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags("")).toEqual([]);
  });

  it("drops empty entries from trailing commas", () => {
    expect(parseTags("paisaje,,retrato,")).toEqual(["paisaje", "retrato"]);
  });
});

describe("formatTags", () => {
  it("joins tags with a comma and space", () => {
    expect(formatTags(["paisaje", "retrato"])).toBe("paisaje, retrato");
  });

  it("drops blank entries", () => {
    expect(formatTags(["paisaje", "  ", "retrato"])).toBe("paisaje, retrato");
  });
});

import { describe, expect, it } from "vitest";
import { getInitials, shortClientId } from "#/lib/format";

describe("getInitials", () => {
  it("uses the first and last name", () => {
    expect(getInitials("María José Guerra")).toBe("MG");
    expect(getInitials("  ana  ")).toBe("A");
  });
});

describe("shortClientId", () => {
  it("prefixes the random tail of the UUIDv7 with the client's initials", () => {
    expect(
      shortClientId({ id: "0192f3a4-5b6c-7d8e-9f01-23456789abcd", name: "Ángela Núñez" }),
    ).toBe("c:an:6789abcd");
  });
});

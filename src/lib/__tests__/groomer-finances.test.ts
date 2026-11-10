import { describe, expect, it } from "vitest";
import { canSeeGroomerFinances } from "../groomer-finances";

describe("groomer financial visibility", () => {
  it("hides own revenue and percentages without the permission", () => {
    expect(canSeeGroomerFinances("groomer", "a", "a", false)).toBe(false);
  });
  it("allows own figures when the owner enables the checkbox", () => {
    expect(canSeeGroomerFinances("groomer", "a", "a", true)).toBe(true);
  });
  it("never exposes another groomer's figures to a groomer", () => {
    expect(canSeeGroomerFinances("groomer", "a", "b", true)).toBe(false);
  });
  it("preserves permission-controlled visibility for administrators", () => {
    expect(canSeeGroomerFinances("admin", null, "a", false)).toBe(false);
    expect(canSeeGroomerFinances("admin", null, "a", true)).toBe(true);
  });
});
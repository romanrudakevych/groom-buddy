import { describe, it, expect } from "vitest";
import { sizePrice } from "../crm";
describe("size price grid", () => {
  it("S short coat", () => expect(sizePrice(4, 25, "Krátká")).toBe(1200));
  it("M curly", () => expect(sizePrice(8, 35, "Kudrnatá")).toBe(1600));
  it("M+ long", () => expect(sizePrice(15, 45, "Dlouhá")).toBe(1800));
  it("L long", () => expect(sizePrice(30, 60, "Dlouhá")).toBe(2500));
  it("XL over 40 kg", () => expect(sizePrice(45, 70, "Krátká")).toBe(3000));
  it("no size data", () => expect(sizePrice(null, null, "Krátká")).toBeNull());
});

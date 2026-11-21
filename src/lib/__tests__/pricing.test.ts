import { describe, it, expect } from "vitest";
import { SIZE_PRICED_SERVICE, servicePriceForDog, sizePrice } from "../crm";
describe("size price grid", () => {
  it("S short coat", () => expect(sizePrice(4, 25, "Krátká")).toBe(1200));
  it("M curly", () => expect(sizePrice(8, 35, "Kudrnatá")).toBe(1600));
  it("M+ long", () => expect(sizePrice(15, 45, "Dlouhá")).toBe(1800));
  it("L long", () => expect(sizePrice(30, 60, "Dlouhá")).toBe(2500));
  it("XL over 40 kg", () => expect(sizePrice(45, 70, "Krátká")).toBe(3000));
  it("no size data", () => expect(sizePrice(null, null, "Krátká")).toBeNull());
});

describe("size price tier boundaries", () => {
  it("includes the tier limit itself", () => {
    expect(sizePrice(5, 28, "Krátká")).toBe(1200);
    expect(sizePrice(5.1, 28, "Krátká")).toBe(1400);
  });
  it("uses whichever of weight or height is known", () => {
    expect(sizePrice(null, 45, "Dlouhá")).toBe(1800);
    expect(sizePrice(9, null, "Krátká")).toBe(1400);
  });
});

describe("service price for a dog", () => {
  const full = {
    id: "s",
    name: SIZE_PRICED_SERVICE,
    category: null,
    duration_minutes: 120,
    price: 999,
  };
  const bath = { ...full, name: "Koupání", price: 500 };
  it("prices the full-care service by size", () => {
    expect(servicePriceForDog(full, { weight: 8, height: 35, coat: "Kudrnatá" })).toBe(1600);
  });
  it("keeps the list price for other services, unknown dogs and unknown sizes", () => {
    expect(servicePriceForDog(bath, { weight: 30, height: 60, coat: "Dlouhá" })).toBe(500);
    expect(servicePriceForDog(full, null)).toBe(999);
    expect(servicePriceForDog(full, { weight: null, height: null, coat: "Dlouhá" })).toBe(999);
  });
});

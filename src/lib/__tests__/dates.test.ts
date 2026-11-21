import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, czk, formatDate, fromISO, mondayOf, monthRange, toISO, todayISO } from "../crm";

describe("ISO dates", () => {
  afterEach(() => vi.useRealTimers());

  it("formats and parses local dates without timezone shifts", () => {
    expect(toISO(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toISO(fromISO("2026-12-31"))).toBe("2026-12-31");
    expect(fromISO("2026-03-01").getDate()).toBe(1);
  });

  it("shows dates in Czech day. month. year form", () => {
    expect(formatDate("2026-10-09")).toBe("9. 10. 2026");
  });

  it("finds the Monday of the week", () => {
    expect(toISO(mondayOf(new Date(2026, 10, 1)))).toBe("2026-10-26"); // Sunday
    expect(toISO(mondayOf(new Date(2026, 9, 26)))).toBe("2026-10-26"); // Monday itself
    expect(mondayOf(new Date(2026, 9, 28, 15, 30)).getHours()).toBe(0);
  });

  it("adds days across month and year ends without mutating the input", () => {
    const d = new Date(2026, 11, 30);
    expect(toISO(addDays(d, 3))).toBe("2027-01-02");
    expect(toISO(addDays(d, -30))).toBe("2026-11-30");
    expect(toISO(d)).toBe("2026-12-30");
  });

  it("gives today and month ranges relative to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 15, 12));
    expect(todayISO()).toBe("2026-02-15");
    expect(monthRange()).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange(-2)).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });
});

describe("czk", () => {
  it("formats amounts in Czech crowns", () => {
    expect(czk(1200).replace(/\s/g, " ")).toBe("1 200 Kč");
    expect(czk(0)).toBe("0 Kč");
  });
});

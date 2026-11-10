import { describe, expect, it } from "vitest";
import { compactSlots, previousDuration } from "../booking";

describe("compact booking slots", () => {
  it("offers only 09:00 on an empty day (no 09:30, 10:00…)", () => {
    expect(compactSlots([], 120)).toEqual(["09:00"]);
  });
  it("offers start right after a visit and flush before the next one", () => {
    // busy 09:00-11:00 and 15:00-16:00, 120 min visit
    const s = compactSlots([[540, 660], [900, 960]], 120);
    expect(s).toEqual(["11:00", "13:00", "16:00"]);
  });
  it("skips gaps shorter than the visit", () => {
    expect(compactSlots([[540, 600], [660, 1200]], 90)).toEqual([]);
  });
});

describe("previous visit length", () => {
  it("uses actual duration of the last completed visit instead of 120", () => {
    const appts = [
      { dog_id: "d", groomer_id: "g", date: "2026-09-01", time: "10:00", status: "Dokončeno", planned_duration: 120, actual_duration: 100, serviceIds: ["s"] },
      { dog_id: "d", groomer_id: "g", date: "2026-10-01", time: "10:00", status: "Dokončeno", planned_duration: 120, actual_duration: 90, serviceIds: ["s"] },
    ];
    expect(previousDuration(appts, "d", { duration: 120, serviceIds: [] }).duration).toBe(90);
    expect(previousDuration(appts, "x", { duration: 120, serviceIds: [] }).duration).toBe(120);
  });
});

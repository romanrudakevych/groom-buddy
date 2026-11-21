import { afterEach, describe, expect, it, vi } from "vitest";
import { slotsFor } from "@/components/crm/SlotPicker";
import { appt, crmData, shift } from "./fixtures";

// 2026-10-29 is a Thursday in the week starting Monday 2026-10-26.
const DATE = "2026-10-29";
const working = shift({ groomer_id: "g1", week_start: "2026-10-26", day_of_week: 4 });

describe("slotsFor", () => {
  afterEach(() => vi.useRealTimers());

  it("returns nothing when the groomer has no shift or a day off", () => {
    expect(slotsFor(crmData(), "g1", DATE, 60)).toEqual([]);
    expect(slotsFor(crmData({ shifts: [{ ...working, value: "Volno" }] }), "g1", DATE, 60)).toEqual(
      [],
    );
  });

  it("offers the whole day on a free working day", () => {
    const slots = slotsFor(crmData({ shifts: [working] }), "g1", DATE, 60);
    expect(slots[0]?.time).toBe("09:00");
    expect(slots.at(-1)?.time).toBe("19:00");
  });

  it("skips booked time, except for the visit being edited", () => {
    const visit = appt({ id: "edit-me", date: DATE, time: "09:00", status: "Naplánováno" });
    const data = crmData({ shifts: [working], appointments: [visit] });
    expect(slotsFor(data, "g1", DATE, 60).map((s) => s.time)).not.toContain("09:00");
    expect(slotsFor(data, "g1", DATE, 60, "edit-me").map((s) => s.time)).toContain("09:00");
  });

  it("hides past start times today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 29, 14, 10));
    const slots = slotsFor(crmData({ shifts: [working] }), "g1", DATE, 60);
    expect(slots[0]?.time).toBe("14:30");
  });
});

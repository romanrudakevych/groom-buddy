import { describe, expect, it } from "vitest";
import {
  allSlots,
  busyIntervals,
  compactSlots,
  fromMin,
  periodOf,
  previousDuration,
  toMin,
} from "../booking";

describe("compact booking slots", () => {
  it("offers only 09:00 on an empty day (no 09:30, 10:00…)", () => {
    expect(compactSlots([], 120)).toEqual(["09:00"]);
  });
  it("offers start right after a visit and flush before the next one", () => {
    // busy 09:00-11:00 and 15:00-16:00, 120 min visit
    const s = compactSlots(
      [
        [540, 660],
        [900, 960],
      ],
      120,
    );
    expect(s).toEqual(["11:00", "13:00", "16:00"]);
  });
  it("skips gaps shorter than the visit", () => {
    expect(
      compactSlots(
        [
          [540, 600],
          [660, 1200],
        ],
        90,
      ),
    ).toEqual([]);
  });
});

describe("previous visit length", () => {
  it("uses actual duration of the last completed visit instead of 120", () => {
    const appts = [
      {
        dog_id: "d",
        groomer_id: "g",
        date: "2026-09-01",
        time: "10:00",
        status: "Dokončeno",
        planned_duration: 120,
        actual_duration: 100,
        serviceIds: ["s"],
      },
      {
        dog_id: "d",
        groomer_id: "g",
        date: "2026-10-01",
        time: "10:00",
        status: "Dokončeno",
        planned_duration: 120,
        actual_duration: 90,
        serviceIds: ["s"],
      },
    ];
    expect(previousDuration(appts, "d", { duration: 120, serviceIds: [] }).duration).toBe(90);
    expect(previousDuration(appts, "x", { duration: 120, serviceIds: [] }).duration).toBe(120);
  });
});

describe("time conversion", () => {
  it("converts HH:MM to minutes and back", () => {
    expect(toMin("09:30")).toBe(570);
    expect(toMin("00:00")).toBe(0);
    expect(fromMin(570)).toBe("09:30");
    expect(fromMin(1200)).toBe("20:00");
    expect(fromMin(toMin("13:05"))).toBe("13:05");
  });
});

describe("busy intervals", () => {
  const base = { groomer_id: "g", date: "2026-10-29", status: "Naplánováno" };
  it("keeps only the groomer's non-cancelled visits that day, sorted", () => {
    const busy = busyIntervals(
      [
        { ...base, time: "14:00", planned_duration: 60, actual_duration: null },
        { ...base, time: "09:00", planned_duration: 120, actual_duration: null },
        { ...base, time: "11:00", status: "Zrušeno", planned_duration: 60, actual_duration: null },
        { ...base, groomer_id: "x", time: "12:00", planned_duration: 60, actual_duration: null },
        { ...base, date: "2026-10-30", time: "12:00", planned_duration: 60, actual_duration: null },
      ],
      "g",
      "2026-10-29",
    );
    expect(busy).toEqual([
      [540, 660],
      [840, 900],
    ]);
  });
  it("uses the actual duration only for completed visits", () => {
    const visit = { ...base, time: "10:00", planned_duration: 60, actual_duration: 90 };
    expect(busyIntervals([{ ...visit, status: "Dokončeno" }], "g", base.date)).toEqual([
      [600, 690],
    ]);
    expect(busyIntervals([visit], "g", base.date)).toEqual([[600, 660]]);
  });
  it("blocks at least one 30-minute step", () => {
    const visit = { ...base, time: "10:00", planned_duration: 0, actual_duration: null };
    expect(busyIntervals([visit], "g", base.date)).toEqual([[600, 630]]);
  });
});

describe("compact slots with a start limit", () => {
  it("rounds the earliest start up to the next half hour", () => {
    expect(compactSlots([], 60, toMin("10:10"))).toEqual(["10:30"]);
  });
  it("offers nothing when the rest of the day is too short", () => {
    expect(compactSlots([], 120, toMin("18:30"))).toEqual([]);
  });
});

describe("all slots", () => {
  it("lists every half-hour start that fits and marks gap edges as best", () => {
    const slots = allSlots([[600, 660]], 60); // busy 10:00-11:00
    const times = slots.map((s) => s.time);
    expect(times[0]).toBe("09:00");
    expect(times).not.toContain("09:30"); // 09:30-10:30 overlaps
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:30");
    expect(times).toContain("11:00");
    expect(times.at(-1)).toBe("19:00"); // last start that ends by 20:00
    expect(slots.filter((s) => s.best).map((s) => s.time)).toEqual(["09:00", "11:00"]);
  });
  it("respects the start limit", () => {
    expect(allSlots([], 60, toMin("18:45")).map((s) => s.time)).toEqual(["19:00"]);
  });
});

describe("previous visit fallbacks", () => {
  const done = {
    dog_id: "d",
    groomer_id: "g",
    date: "2026-10-01",
    time: "10:00",
    status: "Dokončeno",
    planned_duration: 75,
    actual_duration: null,
    serviceIds: [] as string[],
  };
  const fallback = { duration: 120, serviceIds: ["base"] };
  it("returns the fallback with no date when the dog has no completed visit", () => {
    expect(previousDuration([{ ...done, status: "Zrušeno" }], "d", fallback)).toEqual({
      ...fallback,
      fromDate: null,
    });
  });
  it("falls back to planned duration and default services", () => {
    expect(previousDuration([done], "d", fallback)).toEqual({
      duration: 75,
      serviceIds: ["base"],
      fromDate: "2026-10-01",
    });
  });
});

describe("day period", () => {
  it("splits the day at 12:00 and 16:00", () => {
    expect(periodOf("11:59")).toBe("morning");
    expect(periodOf("12:00")).toBe("afternoon");
    expect(periodOf("15:59")).toBe("afternoon");
    expect(periodOf("16:00")).toBe("evening");
  });
});

import { describe, expect, it } from "vitest";
import {
  GROOMER_PALETTE,
  STATUSES,
  groomerColor,
  isAppointmentLocked,
  isUpcomingStatus,
  nextGroomerColor,
} from "../crm";
import { groomer } from "./fixtures";

describe("appointment locking", () => {
  it("locks only completed visits", () => {
    expect(isAppointmentLocked({ status: "Dokončeno" })).toBe(true);
    for (const s of STATUSES.filter((s) => s !== "Dokončeno")) {
      expect(isAppointmentLocked({ status: s })).toBe(false);
    }
    expect(isAppointmentLocked(null)).toBe(false);
    expect(isAppointmentLocked(undefined)).toBe(false);
  });
  it("treats planned and confirmed visits as upcoming", () => {
    expect(STATUSES.filter(isUpcomingStatus)).toEqual(["Naplánováno", "Potvrzeno"]);
  });
});

describe("groomer colors", () => {
  const groomers = [
    groomer({ id: "a", color: "#123456" }),
    groomer({ id: "b" }),
    groomer({ id: "c" }),
  ];
  it("uses the saved color, else the palette color for the groomer's position", () => {
    expect(groomerColor(groomers, "a")).toBe("#123456");
    expect(groomerColor(groomers, "c")).toBe(GROOMER_PALETTE[2]);
    expect(groomerColor(groomers, "unknown")).toBe(GROOMER_PALETTE[0]);
  });
  it("picks the first palette color nobody uses yet", () => {
    expect(nextGroomerColor([])).toBe(GROOMER_PALETTE[0]);
    expect(nextGroomerColor([groomer({ color: GROOMER_PALETTE[0]! })])).toBe(GROOMER_PALETTE[1]);
  });
  it("wraps around when every palette color is taken", () => {
    const all = GROOMER_PALETTE.map((color) => groomer({ color }));
    expect(nextGroomerColor(all)).toBe(GROOMER_PALETTE[0]);
  });
});

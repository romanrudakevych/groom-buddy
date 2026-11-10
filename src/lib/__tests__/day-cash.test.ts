import { describe, expect, it } from "vitest";
import { dayCash, drawerBalance, isUpcomingStatus, type Appointment, type CashOperation } from "../crm";

const groomers = [{ id: "g1", salon_id: "s1" }, { id: "g2", salon_id: "s2" }] as never;
const appt = (p: Partial<Appointment>) => ({ id: Math.random() + "", dog_id: "d", groomer_id: "g1", date: "2026-10-29", time: "09:00", planned_duration: 60, price: 1000, status: "Dokončeno", actual_duration: 60, behavior_during_visit: null, haircut_notes: null, notes: null, paid_by_card: false, serviceIds: [], ...p }) as Appointment;
const op = (p: Partial<CashOperation>) => ({ id: "o", salon_id: "s1", type: "Vklad", amount: 0, date: "2026-10-29", note: null, created_at: "", ...p }) as CashOperation;

describe("day cash", () => {
  const data = {
    groomers,
    appointments: [
      appt({ price: 1200 }),
      appt({ price: 800, paid_by_card: true }),
      appt({ price: 500, status: "Potvrzeno" }),
      appt({ price: 900, groomer_id: "g2" }),
      appt({ price: 700, date: "2026-10-28" }),
    ],
    cashOps: [op({ type: "Vklad", amount: 2000 }), op({ type: "Výdaj", amount: 300 }), op({ type: "Inkaso", amount: 1000, date: "2026-10-28" })],
  };
  it("counts only today's completed cash visits of the salon plus operations", () => {
    expect(dayCash(data, "s1", "2026-10-29")).toEqual({ visitsCash: 1200, card: 800, deposits: 2000, outflows: 300, net: 2900 });
  });
  it("expected drawer includes previous days", () => {
    expect(drawerBalance(data, "s1", "2026-10-29")).toBe(700 - 1000 + 1200 + 2000 - 300);
  });
  it("confirmed visits stay upcoming", () => {
    expect(isUpcomingStatus("Potvrzeno")).toBe(true);
    expect(isUpcomingStatus("Dokončeno")).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { inactiveDogs } from "@/lib/crm";

const dog = { id: "d1", name: "Rex", clientIds: [] } as never;
const appt = (date: string, status: string) =>
  ({ id: date + status, dog_id: "d1", date, status }) as never;

describe("inactiveDogs", () => {
  it("flags a dog absent longer than 60 days", () => {
    const r = inactiveDogs({ dogs: [dog], appointments: [appt("2026-08-01", "Dokončeno")], contacts: [] }, 60, "2026-10-11");
    expect(r).toHaveLength(1);
    expect(r[0]!.days).toBe(71);
  });
  it("does not flag a dog with an upcoming visit", () => {
    const r = inactiveDogs(
      { dogs: [dog], appointments: [appt("2026-08-01", "Dokončeno"), appt("2026-10-20", "Naplánováno")], contacts: [] },
      60,
      "2026-10-11",
    );
    expect(r).toHaveLength(0);
  });
  it("hides a dog after it was contacted", () => {
    const r = inactiveDogs(
      {
        dogs: [dog],
        appointments: [appt("2026-08-01", "Dokončeno")],
        contacts: [{ id: "c", dog_id: "d1", contacted_at: "2026-10-10", result: "Kontaktován", reason: "Drahé", note: null, remind_on: null, created_at: "x" }],
      },
      60,
      "2026-10-11",
    );
    expect(r).toHaveLength(0);
  });
});

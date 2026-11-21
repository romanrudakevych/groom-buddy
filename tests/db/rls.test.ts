/**
 * Row-level security on the real schema (local Supabase, `npm run test:db`).
 * The UI only hides things; these policies are what actually protect the data.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../src/integrations/supabase/types";
import { localSupabase } from "../support/local-supabase";
import { PASSWORD, USERS, seed, type Seeded, type TestRole } from "../support/seed";

type Db = SupabaseClient<Database>;
const anonClient = (): Db => {
  const { url, anonKey } = localSupabase();
  return createClient<Database>(url, anonKey, { auth: { persistSession: false } });
};
async function signedIn(role: TestRole): Promise<Db> {
  const db = anonClient();
  const { error } = await db.auth.signInWithPassword({ email: USERS[role], password: PASSWORD });
  if (error) throw new Error(`sign in ${role}: ${error.message}`);
  return db;
}
const rows = async (db: Db, table: keyof Database["public"]["Tables"]) => {
  const { data, error } = await db.from(table).select("*");
  return error ? [] : (data ?? []);
};

let s: Seeded;
let as: Record<TestRole, Db>;
beforeAll(async () => {
  s = await seed();
  as = {
    owner: await signedIn("owner"),
    admin: await signedIn("admin"),
    groomer: await signedIn("groomer"),
  };
});

describe("anonymous visitor", () => {
  it.each([
    "clients",
    "dogs",
    "appointments",
    "cash_operations",
    "audit_logs",
    "user_roles",
  ] as const)("reads no %s", async (table) => {
    expect(await rows(anonClient(), table)).toEqual([]);
  });
});

describe("groomer", () => {
  it("sees only their own visits", async () => {
    const visits = (await rows(as.groomer, "appointments")) as { groomer_id: string }[];
    expect(visits.length).toBeGreaterThan(0);
    expect(visits.every((v) => v.groomer_id === s.groomerId)).toBe(true);
  });
  it("sees the dogs they groom but no client records", async () => {
    const dogs = (await rows(as.groomer, "dogs")) as { id: string }[];
    expect(dogs.map((d) => d.id)).toContain(s.dogId);
    expect(await rows(as.groomer, "clients")).toEqual([]);
  });
  it("reads no cash, closings or audit log", async () => {
    expect(await rows(as.groomer, "cash_operations")).toEqual([]);
    expect(await rows(as.groomer, "cash_closings")).toEqual([]);
    expect(await rows(as.groomer, "audit_logs")).toEqual([]);
  });
  it("cannot change another groomer's visit", async () => {
    const { data } = await as.groomer
      .from("appointments")
      .update({ notes: "hijack" })
      .eq("id", s.otherApptId)
      .select("id");
    expect(data ?? []).toEqual([]);
  });
  it("cannot write cash operations", async () => {
    const { error } = await as.groomer
      .from("cash_operations")
      .insert({ salon_id: s.salonId, type: "Vklad", amount: 1, date: "2026-01-01" });
    expect(error).not.toBeNull();
  });
});

describe("admin", () => {
  it("works with clients and cash but cannot read the audit log", async () => {
    expect((await rows(as.admin, "clients")).length).toBeGreaterThan(0);
    expect((await rows(as.admin, "cash_operations")).length).toBeGreaterThan(0);
    expect(await rows(as.admin, "audit_logs")).toEqual([]);
  });
  it("cannot promote themselves or grant permissions", async () => {
    const { data: me } = await as.admin.auth.getUser();
    const promote = await as.admin
      .from("user_roles")
      .update({ role: "owner" })
      .eq("user_id", me.user!.id)
      .select("id");
    expect(promote.data ?? []).toEqual([]);
    const grant = await as.admin
      .from("user_permissions")
      .insert({ user_id: me.user!.id, permission: "logs", allowed: true });
    expect(grant.error).not.toBeNull();
  });
});

describe("owner", () => {
  it("reads the audit log", async () => {
    expect((await rows(as.owner, "audit_logs")).length).toBeGreaterThan(0);
  });
});

describe("completed visit lock", () => {
  it("rejects changing the price of a completed visit", async () => {
    const { error } = await as.owner
      .from("appointments")
      .update({ price: 1 })
      .eq("id", s.doneApptId);
    expect(error?.message).toMatch(/locked/i);
  });
  it("still allows editing its notes", async () => {
    const { error } = await as.owner
      .from("appointments")
      .update({ notes: `checked ${Date.now()}` })
      .eq("id", s.doneApptId);
    expect(error).toBeNull();
  });
  it("rejects adding services to a completed visit", async () => {
    const svc = (await as.owner.from("services").select("id").limit(1)).data?.[0];
    const { error } = await as.owner
      .from("appointment_services")
      .insert({ appointment_id: s.doneApptId, service_id: svc!.id });
    expect(error?.message).toMatch(/locked/i);
  });
});

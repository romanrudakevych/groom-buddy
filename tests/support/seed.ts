/**
 * Test fixtures for the local Supabase stack: one user per role, two groomers with
 * shifts, a client with a dog, visits and a cash operation. Safe to run repeatedly.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import { localSupabase } from "./local-supabase";

export const PASSWORD = "e2e-password-123";
export const USERS = {
  owner: "owner@e2e.test",
  admin: "admin@e2e.test",
  groomer: "groomer@e2e.test",
} as const;
export type TestRole = keyof typeof USERS;

export const NAMES = {
  groomer: "E2E Eva",
  otherGroomer: "E2E Petr",
  client: "E2E Majitel",
  dog: "E2E Rex",
} as const;

export type Seeded = {
  salonId: string;
  salonName: string;
  groomerId: string;
  otherGroomerId: string;
  clientId: string;
  dogId: string;
  /** Completed visit with the role's own groomer (locked). */
  doneApptId: string;
  /** Planned visit with the other groomer. */
  otherApptId: string;
};

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

const must = <T>(label: string, r: { data: T; error: { message: string } | null }) => {
  if (r.error || r.data == null) throw new Error(`${label}: ${r.error?.message ?? "no data"}`);
  return r.data as NonNullable<T>;
};

export function adminClient(): SupabaseClient<Database> {
  const { url, serviceKey } = localSupabase();
  return createClient<Database>(url, serviceKey, { auth: { persistSession: false } });
}

async function ensureUser(db: SupabaseClient<Database>, email: string) {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = data.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const created = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (created.error) throw new Error(`create ${email}: ${created.error.message}`);
  return created.data.user.id;
}

async function findOrInsert<T extends "groomers" | "clients" | "dogs">(
  typed: SupabaseClient<Database>,
  table: T,
  name: string,
  row: Database["public"]["Tables"][T]["Insert"],
): Promise<string> {
  // Untyped: the generated types cannot narrow `.eq("name")` over a union of tables.
  const db = typed as unknown as SupabaseClient;
  const found = must(table, await db.from(table).select("id").eq("name", name).limit(1));
  const first = (found as { id: string }[])[0];
  if (first) return first.id;
  const inserted = must(table, await db.from(table).insert(row).select("id").single());
  return (inserted as { id: string }).id;
}

export async function seed(): Promise<Seeded> {
  const db = adminClient();

  const salons = must("salons", await db.from("salons").select("id, name").order("name"));
  const salon = salons[0];
  if (!salon) throw new Error("No salons: the migrations should seed them");

  const groomerId = await findOrInsert(db, "groomers", NAMES.groomer, {
    name: NAMES.groomer,
    salon_id: salon.id,
  });
  const otherGroomerId = await findOrInsert(db, "groomers", NAMES.otherGroomer, {
    name: NAMES.otherGroomer,
    salon_id: salon.id,
  });

  const ids = {
    owner: await ensureUser(db, USERS.owner),
    admin: await ensureUser(db, USERS.admin),
    groomer: await ensureUser(db, USERS.groomer),
  };
  must(
    "user_roles",
    await db.from("user_roles").upsert(
      [
        { user_id: ids.owner, role: "owner", groomer_id: null },
        { user_id: ids.admin, role: "admin", groomer_id: null },
        { user_id: ids.groomer, role: "groomer", groomer_id: groomerId },
      ],
      { onConflict: "user_id" },
    ),
  );

  // Both groomers work every day this week and next, so booking always finds slots.
  const monday = mondayOf(new Date());
  const shifts = [0, 7].flatMap((offset) =>
    [1, 2, 3, 4, 5, 6, 7].flatMap((day_of_week) =>
      [groomerId, otherGroomerId].map((groomer_id) => ({
        groomer_id,
        week_start: toISO(addDays(monday, offset)),
        day_of_week,
        value: "Celý den",
      })),
    ),
  );
  must(
    "shifts",
    await db.from("shifts").upsert(shifts, { onConflict: "groomer_id,week_start,day_of_week" }),
  );

  const clientId = await findOrInsert(db, "clients", NAMES.client, { name: NAMES.client });
  const dogId = await findOrInsert(db, "dogs", NAMES.dog, { name: NAMES.dog, owner_id: clientId });

  const yesterday = toISO(addDays(new Date(), -1));
  const appts = must(
    "appointments",
    await db.from("appointments").select("id, groomer_id, status").eq("dog_id", dogId),
  );
  let doneApptId = appts.find((a) => a.groomer_id === groomerId && a.status === "Dokončeno")?.id;
  if (!doneApptId) {
    doneApptId = must(
      "done appointment",
      await db
        .from("appointments")
        .insert({
          dog_id: dogId,
          groomer_id: groomerId,
          date: yesterday,
          time: "10:00",
          planned_duration: 60,
          actual_duration: 60,
          behavior_during_visit: "Klidný",
          price: 1200,
          status: "Dokončeno",
        })
        .select("id")
        .single(),
    ).id;
  }
  let otherApptId = appts.find((a) => a.groomer_id === otherGroomerId)?.id;
  if (!otherApptId) {
    otherApptId = must(
      "other appointment",
      await db
        .from("appointments")
        .insert({
          dog_id: dogId,
          groomer_id: otherGroomerId,
          date: toISO(addDays(new Date(), 14)),
          time: "15:00",
          planned_duration: 60,
          price: 900,
          status: "Naplánováno",
        })
        .select("id")
        .single(),
    ).id;
  }

  const ops = must("cash_operations", await db.from("cash_operations").select("id").limit(1));
  if (!ops.length) {
    must(
      "cash_operations",
      await db
        .from("cash_operations")
        .insert({ salon_id: salon.id, type: "Vklad", amount: 500, date: yesterday, note: "e2e" }),
    );
  }

  return {
    salonId: salon.id,
    salonName: salon.name,
    groomerId,
    otherGroomerId,
    clientId,
    dogId,
    doneApptId,
    otherApptId,
  };
}

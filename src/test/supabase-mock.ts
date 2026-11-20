/**
 * In-memory stand-in for `@/integrations/supabase/client`. Use it with
 *
 *   vi.mock("@/integrations/supabase/client", () => import("@/test/supabase-mock"));
 *
 * then set the signed-in user and table rows with `resetSupabase` / `signInAs`.
 * Queries return the table's rows filtered by `.eq()`; every other builder method is a no-op.
 */
import { vi } from "vitest";
import type { AppRole } from "@/lib/auth";

type Row = Record<string, unknown>;
type FakeSession = { user: { id: string; email: string; user_metadata: Row } };

const state: { session: FakeSession | null; tables: Record<string, Row[]> } = {
  session: null,
  tables: {},
};

function query(table: string) {
  const filters: [string, unknown][] = [];
  const rows = () =>
    (state.tables[table] ?? []).filter((r) => filters.every(([col, val]) => r[col] === val));
  const builder: unknown = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "then")
          return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve({ data: rows(), error: null }).then(resolve, reject);
        if (prop === "maybeSingle" || prop === "single")
          return () => Promise.resolve({ data: rows()[0] ?? null, error: null });
        if (prop === "eq")
          return (col: string, val: unknown) => {
            filters.push([col, val]);
            return builder;
          };
        return () => builder;
      },
    },
  );
  return builder;
}

export const supabase = {
  from: vi.fn(query),
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: state.session } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null as Error | null })),
    resetPasswordForEmail: vi.fn(() => Promise.resolve({ data: {}, error: null as Error | null })),
    updateUser: vi.fn(() => Promise.resolve({ data: {}, error: null as Error | null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
  },
};

export function resetSupabase(tables: Record<string, Row[]> = {}) {
  state.session = null;
  state.tables = tables;
  vi.clearAllMocks();
}

/** Signs a user in with a role and the given role_permissions rows (owner gets all anyway). */
export function signInAs(
  role: AppRole | null,
  { permissions = [] as string[], groomerId = null as string | null } = {},
) {
  state.session = { user: { id: "u1", email: `${role ?? "nobody"}@test.cz`, user_metadata: {} } };
  state.tables["user_roles"] = role ? [{ user_id: "u1", role, groomer_id: groomerId }] : [];
  state.tables["role_permissions"] = permissions.map((permission) => ({
    role,
    permission,
    allowed: true,
  }));
}

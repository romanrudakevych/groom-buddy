import { createContext, useContext, useEffect, useState, type Context, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isAdminRestrictedPath, isAdminRestrictedPermission } from "@/lib/access";

export type AppRole = "owner" | "admin" | "groomer";

type AuthState = {
  loading: boolean;
  session: Session | null;
  role: AppRole | null;
  groomerId: string | null;
  permissions: Set<string>;
  can: (permission: Permission) => boolean;
  signOut: () => Promise<void>;
};

// Cached on globalThis so hot reloads reuse one context instance (provider and consumers stay matched).
const g = globalThis as unknown as { __crmAuthContext?: Context<AuthState | null> };
const AuthContext = (g.__crmAuthContext ??= createContext<AuthState | null>(null));

/** Permission keys editable by the owner in Settings (stored in role_permissions). */
export const PERMISSIONS = [
  "calendar_all", "appointments_create", "appointments_delete", "client_contacts",
  "dogs_edit", "cash_daily", "cash_page", "reports", "groomer_finances", "logs",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Base paths each role may open; extra pages are unlocked by permissions. Data access is enforced by database policies. */
export const ROLE_PATHS: Record<AppRole, string[] | "all"> = {
  owner: "all",
  admin: ["/", "/kalendar", "/klienti", "/psi", "/groomeri", "/sablony"],
  groomer: ["/kalendar", "/klienti", "/psi", "/groomeri"],
};
const PERMISSION_PATHS: Record<string, Permission> = { "/kassa": "cash_page", "/reporty": "reports", "/logs": "logs" };

const matches = (p: string, pathname: string) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/"));

export function canOpenPath(role: AppRole, pathname: string, permissions: Set<string> = new Set()) {
  if (isAdminRestrictedPath(role, pathname)) return false;
  const allowed = ROLE_PATHS[role];
  if (allowed === "all") return true;
  if (allowed.some((p) => matches(p, pathname))) return true;
  return Object.entries(PERMISSION_PATHS).some(([p, perm]) => matches(p, pathname) && permissions.has(perm));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [groomerId, setGroomerId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadRole = async (s: Session | null) => {
      if (!s) {
        if (active) { setRole(null); setGroomerId(null); setLoading(false); }
        return;
      }
      const { data } = await supabase.from("user_roles").select("role, groomer_id").eq("user_id", s.user.id).maybeSingle();
      if (!active) return;
      const r = (data?.role as AppRole) ?? null;
      let perms = new Set<string>();
      if (r === "owner") perms = new Set(PERMISSIONS);
      else if (r) {
        const [{ data: rows }, { data: own }] = await Promise.all([
          supabase.from("role_permissions").select("permission").eq("role", r).eq("allowed", true),
          supabase.from("user_permissions").select("permission, allowed").eq("user_id", s.user.id),
        ]);
        perms = new Set((rows ?? []).map((x) => x.permission));
        for (const o of own ?? []) { if (o.allowed) perms.add(o.permission); else perms.delete(o.permission); }
      }
      if (!active) return;
      setRole(r);
      setPermissions(perms);
      setGroomerId(data?.groomer_id ?? null);
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setLoading(true);
        queryClient.clear();
        setTimeout(() => void loadRole(s), 0);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void loadRole(data.session);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [queryClient]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ loading, session, role, groomerId, permissions, can: (p) => role === "owner" || (!isAdminRestrictedPermission(role, p) && permissions.has(p)), signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

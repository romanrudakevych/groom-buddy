// Owner-only team management (replaces the former TanStack Start server functions).
// Actions: "delete" | "invite" | "access-link". Needs the service-role key, so it must run server-side.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function requireOwner(req: Request): Promise<string> {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new HttpError(401, "Unauthorized");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Unauthorized");
  const { data: isOwner, error: roleErr } = await admin.rpc("has_role", { _user_id: data.user.id, _role: "owner" });
  if (roleErr) throw new Error(roleErr.message);
  if (!isOwner) throw new HttpError(403, "Forbidden");
  return data.user.id;
}

async function deleteUser(callerId: string, input: { userId?: unknown }) {
  if (!input.userId || typeof input.userId !== "string") throw new HttpError(400, "userId required");
  if (input.userId === callerId) throw new HttpError(400, "Cannot delete yourself");
  const { error } = await admin.auth.admin.deleteUser(input.userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function inviteUser(input: { email?: unknown; fullName?: unknown; role?: unknown; groomerId?: unknown; redirectTo?: unknown }) {
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Invalid email");
  const role = String(input.role);
  if (!["owner", "admin", "groomer"].includes(role)) throw new HttpError(400, "Invalid role");
  const fullName = String(input.fullName ?? "").trim().slice(0, 100);
  const groomerId = typeof input.groomerId === "string" && input.groomerId ? input.groomerId : null;
  const { data: inv, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName || email, needs_password: true },
    redirectTo: typeof input.redirectTo === "string" ? input.redirectTo : undefined,
  });
  if (error) throw new Error(error.message);
  const { error: rErr } = await admin.from("user_roles").upsert(
    { user_id: inv.user.id, role, groomer_id: role === "groomer" ? groomerId : null },
    { onConflict: "user_id" },
  );
  if (rErr) throw new Error(rErr.message);
  return { ok: true };
}

async function accessLink(input: { userId?: unknown; redirectTo?: unknown }) {
  if (!input.userId || typeof input.userId !== "string") throw new HttpError(400, "userId required");
  const { data: u, error: uErr } = await admin.auth.admin.getUserById(input.userId);
  if (uErr || !u.user?.email) throw new HttpError(404, uErr?.message ?? "User not found");
  await admin.auth.admin.updateUserById(input.userId, {
    user_metadata: { ...(u.user.user_metadata ?? {}), needs_password: true },
  });
  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: u.user.email,
    options: { redirectTo: typeof input.redirectTo === "string" ? input.redirectTo : undefined },
  });
  if (error) throw new Error(error.message);
  return { url: link.properties.action_link };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const callerId = await requireOwner(req);
    const body = await req.json().catch(() => ({}));
    switch (body.action) {
      case "delete":
        return json(await deleteUser(callerId, body));
      case "invite":
        return json(await inviteUser(body));
      case "access-link":
        return json(await accessLink(body));
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: e instanceof Error ? e.message : String(e) }, status);
  }
});

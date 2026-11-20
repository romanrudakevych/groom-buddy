import { execSync } from "node:child_process";

export type LocalSupabase = { url: string; anonKey: string; serviceKey: string };

/**
 * Connection details of the local Supabase stack (`npm run db:start`).
 * SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_KEY override `supabase status`.
 */
export function localSupabase(): LocalSupabase {
  const env = process.env;
  if (env["SUPABASE_URL"] && env["SUPABASE_ANON_KEY"] && env["SUPABASE_SERVICE_KEY"]) {
    return {
      url: env["SUPABASE_URL"],
      anonKey: env["SUPABASE_ANON_KEY"],
      serviceKey: env["SUPABASE_SERVICE_KEY"],
    };
  }
  let out: string;
  try {
    out = execSync("npx supabase status -o json", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(
      "Local Supabase is not running. Start it with `npm run db:start` (needs Docker).",
    );
  }
  const s = JSON.parse(out.slice(out.indexOf("{"))) as Record<string, string | undefined>;
  const url = s["API_URL"];
  const anonKey = s["PUBLISHABLE_KEY"] ?? s["ANON_KEY"];
  const serviceKey = s["SECRET_KEY"] ?? s["SERVICE_ROLE_KEY"];
  if (!url || !anonKey || !serviceKey) throw new Error(`Unexpected supabase status output: ${out}`);
  return { url, anonKey, serviceKey };
}

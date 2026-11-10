import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth";

/** Calls the owner-only `team-admin` Edge Function and surfaces its error message. */
async function teamAdmin<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("team-admin", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new Error(payload?.error ?? error.message);
    }
    throw error;
  }
  return data as T;
}

/** Owner-only: permanently removes a CRM user account (not their own). */
export const deleteTeamUser = ({ data }: { data: { userId: string } }) =>
  teamAdmin<{ ok: true }>({ action: "delete", ...data });

/** Owner-only: invites a staff member by email with a pre-assigned role. */
export const inviteTeamUser = ({
  data,
}: {
  data: {
    email: string;
    fullName: string;
    role: AppRole;
    groomerId: string | null;
    redirectTo: string;
  };
}) => teamAdmin<{ ok: true }>({ action: "invite", ...data });

/** Owner-only: creates a fresh one-time link where the employee sets their password (to share via WhatsApp etc.). */
export const createAccessLink = ({ data }: { data: { userId: string; redirectTo: string } }) =>
  teamAdmin<{ url: string }>({ action: "access-link", ...data });

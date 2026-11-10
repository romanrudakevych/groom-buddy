import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pick } from "@/components/crm/Pick";
import { useCrm } from "@/lib/crm";
import { useI18n } from "@/lib/i18n";
import { useAuth, type AppRole, type Permission } from "@/lib/auth";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TranslationKey } from "@/lib/i18n";
import { createAccessLink, deleteTeamUser, inviteTeamUser } from "@/lib/team.api";
import { authRedirectUrl } from "@/lib/app-url";
import { isAdminRestrictedPermission } from "@/lib/access";


type Row = { id: string; email: string | null; full_name: string | null; role: AppRole | null; groomer_id: string | null };

export function Settings() {
  const { t } = useI18n();
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data: crm } = useCrm();
  const users = useQuery({
    queryKey: ["team-users"],
    queryFn: async (): Promise<Row[]> => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name").order("created_at"),
        supabase.from("user_roles").select("user_id, role, groomer_id"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      return (p.data ?? []).map((u) => {
        const role = r.data?.find((x) => x.user_id === u.id);
        return { ...u, role: (role?.role as AppRole) ?? null, groomer_id: role?.groomer_id ?? null };
      });
    },
  });

  const save = async (u: Row, role: string, groomerId: string | null) => {
    let error;
    if (role === "none") {
      ({ error } = await supabase.from("user_roles").delete().eq("user_id", u.id));
    } else {
      ({ error } = await supabase.from("user_roles").upsert(
        { user_id: u.id, role: role as AppRole, groomer_id: role === "groomer" ? groomerId : null },
        { onConflict: "user_id" },
      ));
    }
    if (error) toast.error(error.message);
    else toast.success("✓");
    void qc.invalidateQueries({ queryKey: ["team-users"] });
  };

  const [inviteOpen, setInviteOpen] = useState(false);
  const [permsUser, setPermsUser] = useState<Row | null>(null);
  const removeUser = deleteTeamUser;
  const makeLink = createAccessLink;
  const copyLink = async (u: Row) => {
    try {
      const { url } = await makeLink({ data: { userId: u.id, redirectTo: authRedirectUrl() } });
      await navigator.clipboard.writeText(url).catch(() => window.prompt(t("accessLinkCopy"), url));
      toast.success(t("accessLinkCopied"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };
  const remove = async (u: Row) => {
    if (!window.confirm(t("deleteUserConfirm"))) return;
    try {
      await removeUser({ data: { userId: u.id } });
      toast.success("✓");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    void qc.invalidateQueries({ queryKey: ["team-users"] });
  };

  const roleOptions = [
    { value: "owner", label: t("roleOwner") },
    { value: "admin", label: t("roleAdmin") },
    { value: "groomer", label: t("roleGroomer") },
    { value: "none", label: t("roleNone") },
  ];
  const groomerOptions = [{ value: "", label: "—" }, ...(crm?.groomers ?? []).map((g) => ({ value: g.id, label: g.name }))];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("settings")}</h1>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t("teamUsers")}</CardTitle>
          <Button onClick={() => setInviteOpen(true)}>{t("inviteEmployee")}</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("teamUsersHint")}</p>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-2">{t("user")}</th><th>{t("role")}</th><th>{t("linkedGroomer")}</th><th></th><th></th><th></th></tr></thead>
            <tbody>
              {(users.data ?? []).map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="py-2"><div className="font-medium">{u.full_name || u.email}</div><div className="text-xs text-muted-foreground">{u.email}</div></td>
                  <td className="w-44">
                    <Pick value={u.role ?? "none"} options={roleOptions} disabled={u.id === session?.user.id}
                      onChange={(v) => void save(u, v, u.groomer_id)} />
                  </td>
                  <td className="w-52">
                    {u.role === "groomer" && (
                      <Pick value={u.groomer_id ?? ""} options={groomerOptions}
                        onChange={(v) => void save(u, "groomer", v || null)} />
                    )}
                  </td>
                  <td className="w-24 text-right">
                    {u.id !== session?.user.id && u.role && u.role !== "owner" && (
                      <Button size="sm" variant="outline" onClick={() => setPermsUser(u)}>{t("userPerms")}</Button>
                    )}
                  </td>
                  <td className="w-40 text-right">
                    {u.id !== session?.user.id && (
                      <Button size="sm" variant="ghost" onClick={() => void copyLink(u)}>🔗 {t("accessLinkCopy")}</Button>
                    )}
                  </td>
                  <td className="w-10 text-right">
                    {u.id !== session?.user.id && (
                      <button type="button" title={t("deleteUser")} aria-label={t("deleteUser")}
                        className="rounded px-2 py-1 text-destructive hover:bg-destructive/10" onClick={() => void remove(u)}>🗑</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <PermissionMatrix />
      {permsUser && <UserPermsDialog user={permsUser} onClose={() => setPermsUser(null)} />}
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} roleOptions={roleOptions.filter((r) => r.value !== "none")} groomerOptions={groomerOptions} />
    </div>
  );
}

const GROUPS: { title: TranslationKey; perms: Permission[] }[] = [
  { title: "permGroupCalendar", perms: ["calendar_all", "appointments_create", "appointments_delete"] },
  { title: "permGroupClients", perms: ["client_contacts", "dogs_edit"] },
  { title: "permGroupMoney", perms: ["cash_daily", "cash_page", "reports", "groomer_finances"] },
  { title: "permGroupSystem", perms: ["logs"] },
];
/** Rules enforced by database policies regardless of the checkbox. */
const LOCKED: Partial<Record<Permission, AppRole[]>> = { client_contacts: ["groomer"], calendar_all: ["groomer"] };

function UserPermsDialog({ user, onClose }: { user: Row; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const role = user.role as AppRole;
  const q = useQuery({
    queryKey: ["user-permissions", user.id],
    queryFn: async () => {
      const [d, o] = await Promise.all([
        supabase.from("role_permissions").select("permission, allowed").eq("role", role),
        supabase.from("user_permissions").select("permission, allowed").eq("user_id", user.id),
      ]);
      if (d.error) throw d.error;
      if (o.error) throw o.error;
      const m = new Map<string, boolean>();
      for (const r of d.data ?? []) m.set(r.permission, r.allowed);
      for (const r of o.data ?? []) m.set(r.permission, r.allowed);
      return m;
    },
  });
  const toggle = async (p: Permission, v: boolean) => {
    const { error } = await supabase.from("user_permissions").upsert({ user_id: user.id, permission: p, allowed: v }, { onConflict: "user_id,permission" });
    if (error) toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["user-permissions", user.id] });
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("userPermsTitle")}: {user.full_name || user.email}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{t("userPermsHint")}</p>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="mb-1 font-semibold">{t(g.title)}</div>
              {g.perms.map((p) => {
                const adminRestricted = isAdminRestrictedPermission(role, p);
                const locked = adminRestricted || LOCKED[p]?.includes(role);
                return (
                  <label key={p} className="flex items-center justify-between gap-3 border-t py-2 text-sm" title={locked ? t("permLocked") : undefined}>
                    <span className={locked ? "text-muted-foreground" : ""}>{t(`perm_${p}` as TranslationKey)}</span>
                    <Checkbox checked={locked ? false : (q.data?.get(p) ?? false)} disabled={locked || !q.data}
                      onCheckedChange={(v) => void toggle(p, v === true)} />
                  </label>
                );
              })}
            </div>
          ))}
        </div>
        <DialogFooter><Button onClick={onClose}>OK</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionMatrix() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("role_permissions").select("role, permission, allowed");
      if (error) throw error;
      return data ?? [];
    },
  });
  const allowed = (role: AppRole, p: Permission) => q.data?.some((r) => r.role === role && r.permission === p && r.allowed) ?? false;
  const toggle = async (role: AppRole, p: Permission, v: boolean) => {
    const { error } = await supabase.from("role_permissions").upsert({ role, permission: p, allowed: v }, { onConflict: "role,permission" });
    if (error) toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["role-permissions"] });
  };
  const roles: AppRole[] = ["owner", "admin", "groomer"];
  const label = (r: AppRole) => t(r === "owner" ? "roleOwner" : r === "admin" ? "roleAdmin" : "roleGroomer");
  return (
    <Card>
      <CardHeader><CardTitle>{t("permsTitle")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("permsHint")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">{t("permAction")}</th>
                {roles.map((r) => <th key={r} className="w-28 text-center">{label(r)}</th>)}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g) => (
                <Fragment key={g.title}>
                  <tr key={g.title} className="border-t bg-muted/40"><td colSpan={4} className="py-1.5 font-semibold">{t(g.title)}</td></tr>
                  {g.perms.map((p) => (
                    <tr key={p} className="border-t">
                      <td className="py-2">{t(`perm_${p}` as TranslationKey)}</td>
                      {roles.map((r) => {
                        const adminRestricted = isAdminRestrictedPermission(r, p);
                        const locked = r === "owner" || adminRestricted || LOCKED[p]?.includes(r);
                        return (
                          <td key={r} className="text-center" title={adminRestricted ? t("noAccess") : locked && r !== "owner" ? t("permLocked") : undefined}>
                            <Checkbox checked={r === "owner" ? true : locked ? false : allowed(r, p)} disabled={locked}
                              onCheckedChange={(v) => void toggle(r, p, v === true)} aria-label={`${label(r)}: ${t(`perm_${p}` as TranslationKey)}`} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
              <tr className="border-t">
                <td className="py-2">{t("perm_settings")}</td>
                {roles.map((r) => <td key={r} className="text-center"><Checkbox checked={r === "owner"} disabled /></td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function InviteDialog({ open, onOpenChange, roleOptions, groomerOptions }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  roleOptions: { value: string; label: string }[]; groomerOptions: { value: string; label: string }[];
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const invite = inviteTeamUser;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("admin");
  const [groomerId, setGroomerId] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await invite({ data: { email, fullName: name, role, groomerId: groomerId || null, redirectTo: authRedirectUrl() } });
      toast.success(t("inviteSent"));
      setName(""); setEmail(""); setGroomerId("");
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ["team-users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("inviteEmployee")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder={t("fullName")} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Pick value={role} options={roleOptions} onChange={(v) => setRole(v as AppRole)} />
          {role === "groomer" && <Pick value={groomerId} options={groomerOptions} onChange={setGroomerId} placeholder={t("linkedGroomer")} />}
          <DialogFooter><Button type="submit" disabled={busy}>{t("inviteSend")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

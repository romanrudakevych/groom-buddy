import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useCrm } from "@/lib/crm";
import { useI18n } from "@/lib/i18n";


// Owner-only: enforced server-side by audit_logs RLS.
export const canViewAuditLogs = () => true;

const ACTIONS = ["create", "update", "reschedule", "status_change", "payment_change", "delete"] as const;

type Log = {
  id: string;
  created_at: string;
  actor_name: string;
  entity_type: string;
  action: string;
  description: string;
  details: { old_date?: string; old_time?: string; old_groomer?: string; date?: string; time?: string; groomer?: string; old_status?: string; status?: string; paid_by_card?: boolean };
  salon_id: string | null;
};

export function AuditLogs() {
  const { t, tr, dateLocale } = useI18n();
  const { data: crm } = useCrm();
  const [salon, setSalon] = useState("all");
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: logs = [] } = useQuery({
    queryKey: ["audit_logs"],
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as unknown as Log[];
    },
  });

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        const day = l.created_at.slice(0, 10);
        return (
          (salon === "all" || l.salon_id === salon) &&
          (entity === "all" || l.entity_type === entity) &&
          (action === "all" || l.action === action) &&
          (!from || day >= from) &&
          (!to || day <= to)
        );
      }),
    [logs, salon, entity, action, from, to],
  );

  const tk = (k: string) => (t as (k: string) => string)(k) ?? k;
  const salonName = (id: string | null) => crm.salons.find((s) => s.id === id)?.name ?? "";
  const extra = (l: Log) => {
    const d = l.details ?? {};
    if (l.action === "reschedule") return `${d.old_date} ${d.old_time} ${d.old_groomer ?? ""} → ${d.date} ${d.time} ${d.groomer ?? ""}`;
    if (l.action === "status_change") return `${tr(String(d.old_status))} → ${tr(String(d.status))}`;
    if (l.action === "payment_change") return d.paid_by_card ? t("auditCard") : t("auditCash");
    return "";
  };

  if (!canViewAuditLogs()) return null;
  const sel = "h-9 rounded-md border bg-background px-2 text-sm";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("auditLogs")}</h1>
        <p className="text-sm text-muted-foreground">{t("auditSubtitle")}</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <select className={sel} value={salon} onChange={(e) => setSalon(e.target.value)}>
          <option value="all">{t("bothSalons")}</option>
          {crm.salons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select className={sel} value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="all">{t("auditAllEvents")}</option>
          <option value="appointment">{t("auditEntity_appointment")}</option>
          <option value="cash">{t("auditEntity_cash")}</option>
        </select>
        <select className={sel} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="all">{t("auditAllActions")}</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{tk(`auditAction_${a}`)}</option>
          ))}
        </select>
        <label className="text-sm">{t("auditFrom")} <Input type="date" className="inline-block w-40" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm">{t("auditTo")} <Input type="date" className="inline-block w-40" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{filtered.length}</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("auditEmpty")}</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((l) => (
                <li key={l.id} className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-sm">
                  <span className="w-40 text-muted-foreground">{new Date(l.created_at).toLocaleString(dateLocale)}</span>
                  <span className="w-32 font-medium">{l.actor_name}</span>
                  <span className="w-48">{tk(`auditEntity_${l.entity_type}`)} · {tk(`auditAction_${l.action}`)}</span>
                  <span className="flex-1">
                    {l.description}
                    {extra(l) && <span className="text-muted-foreground"> ({extra(l)})</span>}
                  </span>
                  <span className="text-muted-foreground">{salonName(l.salon_id)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

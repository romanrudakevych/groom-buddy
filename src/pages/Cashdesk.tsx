import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Kpi, Segmented } from "@/components/crm/ui";
import { Pick, opts } from "@/components/crm/Pick";
import {
  CASH_OP_TYPES,
  cashOpSign,
  czk,
  formatDate,
  saveCashOp,
  todayISO,
  useCrm,
  useCrmMutation,
  type CashOpInput,
} from "@/lib/crm";
import { useI18n } from "@/lib/i18n";


type Row = { key: string; date: string; time: string; salon_id: string; label: string; detail: string; amount: number };

export function Cashdesk() {
  const { data } = useCrm();
  const { t, tr } = useI18n();
  const [salon, setSalon] = useState("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState(false);
  const today = todayISO();

  const salonOfGroomer = (id: string) => data.groomers.find((g) => g.id === id)?.salon_id ?? "";
  const inSalon = (id: string) => salon === "all" || id === salon;

  const rows = useMemo<Row[]>(() => {
    const visits: Row[] = data.appointments
      .filter((a) => a.status === "Dokončeno" && !a.paid_by_card && a.date <= today)
      .map((a) => ({
        key: a.id,
        date: a.date,
        time: a.time,
        salon_id: salonOfGroomer(a.groomer_id),
        label: t("cashVisit"),
        detail: `${data.dogs.find((d) => d.id === a.dog_id)?.name ?? "—"} · ${data.groomers.find((g) => g.id === a.groomer_id)?.name ?? ""}`,
        amount: a.price,
      }));
    const ops: Row[] = data.cashOps.map((o) => ({
      key: o.id,
      date: o.date,
      time: o.created_at.slice(11, 16),
      salon_id: o.salon_id,
      label: tr(o.type),
      detail: o.note ?? "",
      amount: cashOpSign(o.type) * o.amount,
    }));
    return [...visits, ...ops].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [data, t, tr, today]);

  const salonRows = rows.filter((r) => inSalon(r.salon_id));
  const balance = salonRows.reduce((s, r) => s + r.amount, 0);
  const todaysDone = data.appointments.filter(
    (a) => a.status === "Dokončeno" && a.date === today && inSalon(salonOfGroomer(a.groomer_id)),
  );
  const cashToday = salonRows.filter((r) => r.date === today).reduce((s, r) => s + r.amount, 0);
  const cardToday = todaysDone.filter((a) => a.paid_by_card).reduce((s, a) => s + a.price, 0);

  const ql = q.trim().toLowerCase();
  const journal = salonRows.filter(
    (r) =>
      (!from || r.date >= from) &&
      (!to || r.date <= to) &&
      (!ql || `${r.label} ${r.detail}`.toLowerCase().includes(ql)),
  );
  const salonName = (id: string) => data.salons.find((s) => s.id === id)?.name ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("cashdesk")}</h1>
        <div className="flex flex-wrap gap-2">
          <Segmented
            value={salon}
            onChange={setSalon}
            options={[
              ...data.salons.map((s) => ({ value: s.id, label: s.name })),
              { value: "all", label: t("bothSalons") },
            ]}
          />
          <Button onClick={() => setOpen(true)}>{t("manualOperation")}</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label={t("cashBalance")} value={czk(balance)} />
        <Kpi label={t("cashToday")} value={czk(cashToday)} />
        <Kpi label={t("cardToday")} value={czk(cardToday)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("cashJournal")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input className="w-64" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              {t("dateFrom")}
              <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              {t("dateTo")}
              <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          {journal.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noMovements")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1">{t("date")}</th>
                  <th>{t("salon")}</th>
                  <th>{t("operationType")}</th>
                  <th>{t("description")}</th>
                  <th className="text-right">{t("amount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {journal.map((r) => (
                  <tr key={r.key}>
                    <td className="py-1">{formatDate(r.date)} {r.time}</td>
                    <td>{salonName(r.salon_id)}</td>
                    <td>{r.label}</td>
                    <td className="text-muted-foreground">{r.detail}</td>
                    <td className={`text-right font-medium ${r.amount < 0 ? "text-destructive" : ""}`}>
                      {r.amount > 0 ? "+" : ""}
                      {czk(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <CashOpDialog open={open} onOpenChange={setOpen} defaultSalon={salon === "all" ? "" : salon} />
    </div>
  );
}

function CashOpDialog({
  open,
  onOpenChange,
  defaultSalon,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSalon: string;
}) {
  const { data } = useCrm();
  const { t, tr } = useI18n();
  const blank = (): CashOpInput => ({ salon_id: defaultSalon, type: "Vklad", amount: 0, date: todayISO(), note: "" });
  const [form, setForm] = useState<CashOpInput>(blank);
  const m = useCrmMutation(async () => saveCashOp(form));
  const canSave = !!form.salon_id && form.amount > 0 && !!form.date;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setForm(blank());
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("manualOperation")}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t("ownerOnlyHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("salon")} required>
            <Pick
              value={form.salon_id}
              onChange={(v) => setForm({ ...form, salon_id: v })}
              options={data.salons.map((s) => ({ value: s.id, label: s.name }))}
              placeholder={t("pickValue")}
            />
          </Field>
          <Field label={t("operationType")} required>
            <Pick value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={opts(CASH_OP_TYPES, tr)} />
          </Field>
          <Field label={t("amountCzk")} required>
            <Input
              type="number"
              min={1}
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </Field>
          <Field label={t("date")} required>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("notes")}>
              <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            disabled={!canSave || m.isPending}
            onClick={() =>
              m.mutate(undefined as never, {
                onSuccess: () => {
                  toast.success(t("operationSaved"));
                  onOpenChange(false);
                },
                onError: (e: unknown) => toast.error(`${t("saveFailed")}: ${String(e)}`),
              })
            }
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

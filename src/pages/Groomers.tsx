import { useNavigate } from "react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionTitle, Segmented, Tag } from "@/components/crm/ui";
import { useDialogs } from "@/components/crm/DialogProvider";
import {
  DAY_LABELS,
  czk,
  groomerRetention,
  groomerDogCount,
  mondayOf,
  setShift,
  toISO,
  useCrm,
  useCrmMutation,
} from "@/lib/crm";
import type { ShiftValue } from "@/lib/crm";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { canSeeGroomerFinances } from "@/lib/groomer-finances";


export function GroomersPage() {
  const { data } = useCrm();
  const { lang, t, tr } = useI18n();
  const navigate = useNavigate();
  const { openGroomer } = useDialogs();
  const { role, groomerId, can } = useAuth();
  const isGroomer = role === "groomer";
  const seeMoney = (id: string) => canSeeGroomerFinances(role, groomerId, id, can("groomer_finances"));
  const canEditShift = (id: string) => !isGroomer || id === groomerId;
  const mutate = useCrmMutation(
    (v: { groomer_id: string; week_start: string; day_of_week: number; value: ShiftValue }) =>
      setShift(v.groomer_id, v.week_start, v.day_of_week, v.value),
  );
  const [salon, setSalon] = useState("all");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const dayNames = lang === "ru" ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] : DAY_LABELS;
  const groomers = data.groomers.filter((g) => salon === "all" || g.salon_id === salon);
  const days = Array.from(
    { length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() },
    (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1),
  );
  const dow = (d: Date) => ((d.getDay() + 6) % 7) + 1;
  const isWorking = (groomerId: string, d: Date) => {
    const ws = toISO(mondayOf(d));
    const v = data.shifts.find(
      (s) => s.groomer_id === groomerId && s.week_start === ws && s.day_of_week === dow(d),
    )?.value;
    return !!v && v !== "Volno";
  };
  const toggle = (groomerId: string, d: Date) =>
    canEditShift(groomerId) &&
    mutate.mutate({
      groomer_id: groomerId,
      week_start: toISO(mondayOf(d)),
      day_of_week: dow(d),
      value: isWorking(groomerId, d) ? "Volno" : "Celý den",
    });
  const monthLabel = month.toLocaleDateString(lang === "ru" ? "ru-RU" : "cs-CZ", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("groomers")}</h1>
        {!isGroomer && <Button onClick={() => openGroomer(null)}>{t("newGroomer")}</Button>}
      </div>

      <Segmented
        value={salon}
        onChange={setSalon}
        options={[
          { value: "all", label: t("bothSalons") },
          ...data.salons.map((s) => ({ value: s.id, label: s.name })),
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groomers.map((g) => {
          const done = data.appointments.filter(
            (a) => a.groomer_id === g.id && a.status === "Dokončeno",
          );
          return (
            <Card
              key={g.id}
              className={isGroomer && g.id !== groomerId ? "" : "cursor-pointer hover:bg-accent"}
              onClick={() => (!isGroomer || g.id === groomerId) && navigate(`/groomeri/${g.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-base">{g.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-1">
                  <Tag>{data.salons.find((s) => s.id === g.salon_id)?.name}</Tag>
                </div>
                <div className="text-muted-foreground">
                  {t("completedVisits")}: <span className="text-foreground">{done.length}</span>
                </div>
                <div className="text-muted-foreground">
                  {t("assignedDogsCount")}: <span className="text-foreground">{groomerDogCount(data.dogs, g.id)}</span>
                </div>
                {seeMoney(g.id) && (<>
                <div className="text-muted-foreground">
                  {t("revenue")}: {" "}
                  <span className="text-foreground">
                    {czk(done.reduce((s, a) => s + a.price, 0))}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {t("returnRate")}:{" "}
                  <span className="text-foreground">{groomerRetention(data.appointments, g.id)} %</span>
                </div>
                </>)}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SectionTitle>{t("shiftPlan")}</SectionTitle>
          <Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            ‹
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const d = new Date();
              setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
          >
            {t("thisMonth")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            ›
          </Button>
          <span className="text-sm font-medium capitalize">{monthLabel}</span>
        </div>

        {data.salons.map((s) => {
          const list = data.groomers.filter((g) => g.salon_id === s.id);
          return (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{s.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 overflow-x-auto p-4 pt-0">
                {[days.slice(0, 15), days.slice(15)].map((half, hi) => (
                <table key={hi} className="border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 w-32 min-w-32 bg-card px-1 py-0.5 text-left text-[11px] font-medium">{hi === 0 ? t("groomer") : ""}</th>
                      <th className="w-10 min-w-10 px-1 py-0.5 text-center text-[11px] font-medium">{hi === 0 ? t("workDays") : ""}</th>
                      {half.map((d) => (
                        <th
                          key={d.getDate()}
                          className={`w-7 min-w-7 px-0 py-0.5 text-center font-normal leading-none ${dow(d) >= 6 ? "bg-muted" : ""}`}
                        >
                          <div className="text-[10px] font-semibold">{d.getDate()}</div>
                          <div className="mt-0.5 text-[9px] text-muted-foreground">{dayNames[dow(d) - 1]}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((g) => (
                      <tr key={g.id} className="border-t">
                        <td className="sticky left-0 z-10 bg-card px-1 py-0.5 text-xs font-medium whitespace-nowrap">{g.name}</td>
                        <td className="px-1 py-0.5 text-center text-[11px] tabular-nums">
                          {hi === 0 ? days.filter((d) => isWorking(g.id, d)).length : ""}
                        </td>
                        {half.map((d) => {
                          const on = isWorking(g.id, d);
                          return (
                            <td key={d.getDate()} className="p-0">
                              <button
                                type="button"
                                title={tr(on ? "Celý den" : "Volno")}
                                disabled={!canEditShift(g.id)}
                                onClick={() => toggle(g.id, d)}
                                className={`h-7 w-7 rounded-sm border text-[10px] leading-none ${on ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"} disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                {on ? "✓" : ""}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

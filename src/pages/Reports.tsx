import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarList, Kpi, Segmented } from "@/components/crm/ui";
import { STATUSES, czk, monthRange, paymentSplit, retentionRate,
  groomerRetention, useCrm } from "@/lib/crm";
import { useI18n } from "@/lib/i18n";


export function Reports() {
  const { data } = useCrm();
  const { t, tr } = useI18n();
  const [range, setRange] = useState("this");

  const filtered = data.appointments.filter((a) => {
    if (range === "all") return true;
    const { from, to } = monthRange(range === "this" ? 0 : -1);
    return a.date >= from && a.date <= to;
  });

  const done = filtered.filter((a) => a.status === "Dokončeno");
  const badCount = filtered.filter(
    (a) => a.status === "Zrušeno" || a.status === "Nedostavil se",
  ).length;

  const revenuePerGroomer = data.groomers
    .map((g) => ({
      label: g.name,
      value: done.filter((a) => a.groomer_id === g.id).reduce((s, a) => s + a.price, 0),
    }))
    .sort((a, b) => b.value - a.value);

  const visitsPerGroomer = data.groomers
    .map((g) => ({ label: g.name, value: done.filter((a) => a.groomer_id === g.id).length }))
    .sort((a, b) => b.value - a.value);

  const returnPerGroomer = data.groomers
    .map((g) => ({ label: g.name, value: groomerRetention(filtered, g.id) }))
    .sort((a, b) => b.value - a.value);

  const revenuePerService = data.services
    .map((s) => ({
      label: tr(s.name),
      value: done.filter((a) => a.serviceIds.includes(s.id)).length * s.price,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("reports")}</h1>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: "this", label: t("thisMonth") },
            { value: "last", label: t("lastMonth") },
            { value: "all", label: t("all") },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={t("cashRevenue")} value={czk(paymentSplit(filtered).cash)} hint={t("completedOnly")} />
        <Kpi label={t("cardRevenue")} value={czk(paymentSplit(filtered).card)} hint={t("completedOnly")} />
        <Kpi
          label={t("clientRetention")}
          value={`${retentionRate(filtered)} %`}
          hint={t("repeatDogsHint")}
        />
        <Kpi
          label={t("cancelledNoShow")}
          value={`${filtered.length ? Math.round((badCount / filtered.length) * 100) : 0} %`}
          hint={`${badCount} / ${filtered.length} ${t("visitsCount")}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("revenueByGroomer")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={revenuePerGroomer} formatValue={czk} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("completedByGroomer")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={visitsPerGroomer} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("returnByGroomer")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={returnPerGroomer} formatValue={(v) => `${v} %`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("statusDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {STATUSES.map((s) => {
                const count = filtered.filter((a) => a.status === s).length;
                const pct = filtered.length ? Math.round((count / filtered.length) * 100) : 0;
                return (
                  <div key={s} className="flex justify-between">
                    <span>{tr(s)}</span>
                    <span className="font-medium">
                      {count} ({pct} %)
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

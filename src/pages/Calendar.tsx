import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/crm/ui";
import { useDialogs } from "@/components/crm/DialogProvider";
import { AppointmentQuickView } from "@/components/crm/AppointmentQuickView";
import {
  DAY_LABELS,
  addDays,
  fromISO,
  groomerColor,
  mondayOf,
  toISO,
  todayISO,
  useCrm,
  type Appointment,
  type CrmData,
  type Groomer,
} from "@/lib/crm";
import { translatedServiceNames, useI18n } from "@/lib/i18n";


type View = "den" | "tyden" | "mesic";

const HOURS = Array.from({ length: 11 }, (_, i) => 9 + i);
const ROW_H = 56;

export function Calendar() {
  const { data } = useCrm();
  const { lang, t, tr, dateLocale } = useI18n();
  const { openAppointment } = useDialogs();
  const { can } = useAuth();
  const [view, setView] = useState<View>("den");
  const [cursor, setCursor] = useState<string>(todayISO());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [salonTab, setSalonTab] = useState<string>("all");
  // Future: groomer role will lock this to their own id.
  const [groomerFilter, setGroomerFilter] = useState<string | null>(null);
  const colorOf = (id: string) => groomerColor(data.groomers, id);
  const visibleSalons = salonTab === "all" ? data.salons : data.salons.filter((s) => s.id === salonTab);
  const legendGroomers = data.groomers.filter((g) => visibleSalons.some((s) => s.id === g.salon_id));
  const selectedAppointment = data.appointments.find((a) => a.id === selectedId) ?? null;

  const date = fromISO(cursor);
  const shift = (dir: number) => {
    if (view === "den") setCursor(toISO(addDays(date, dir)));
    else if (view === "tyden") setCursor(toISO(addDays(date, dir * 7)));
    else {
      const d = new Date(date.getFullYear(), date.getMonth() + dir, 1);
      setCursor(toISO(d));
    }
  };

  const format = (iso: string) => fromISO(iso).toLocaleDateString(dateLocale);
  const dayLabels = lang === "ru" ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] : DAY_LABELS;

  const label = (() => {
    if (view === "den") return format(cursor);
    if (view === "tyden") {
      const start = mondayOf(date);
      return `${format(toISO(start))} – ${format(toISO(addDays(start, 6)))}`;
    }
    return date.toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
  })();

  const goDay = (iso: string) => {
    setCursor(iso);
    setView("den");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("calendar")}</h1>
        {can("appointments_create") && <Button onClick={() => openAppointment(null, { date: cursor })}>{t("newVisit")}</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "den", label: t("day") },
            { value: "tyden", label: t("week") },
            { value: "mesic", label: t("month") },
          ]}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shift(-1)}>
            ‹
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(todayISO())}>
            {t("today")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => shift(1)}>
            ›
          </Button>
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={salonTab}
          onChange={(v) => {
            setSalonTab(v);
            setGroomerFilter(null);
          }}
          options={[
            { value: "all", label: t("allSalons") },
            ...data.salons.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setGroomerFilter(null)}
          className={`rounded-full border px-3 py-1 text-xs ${groomerFilter === null ? "bg-accent font-medium" : ""}`}
        >
          {t("allGroomers")}
        </button>
        {legendGroomers.map((g) => (
          <button
            key={g.id}
            onClick={() => setGroomerFilter(groomerFilter === g.id ? null : g.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${groomerFilter === g.id ? "bg-accent font-medium" : ""}`}
            style={{ borderColor: colorOf(g.id) }}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(g.id) }} />
            {g.name}
          </button>
        ))}
      </div>

      {visibleSalons.map((salon) => {
        const groomers = data.groomers.filter(
          (g) => g.salon_id === salon.id && (!groomerFilter || g.id === groomerFilter),
        );
        const groomerIds = groomers.map((g) => g.id);
        const appts = data.appointments.filter((a) => groomerIds.includes(a.groomer_id));
        return (
          <Card key={salon.id}>
            <CardHeader>
              <CardTitle className="text-base">{salon.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {view === "den" ? (
                <DayView
                  data={data}
                  groomers={groomers}
                  appts={appts.filter((a) => a.date === cursor)}
                  date={cursor}
                  onNew={(groomerId, time) => {
                    if (can("appointments_create")) openAppointment(null, { groomer_id: groomerId, date: cursor, time });
                  }}
                  onOpen={(a) => setSelectedId(a.id)}
                  colorOf={colorOf}
                  tr={tr}
                  t={t}
                />
              ) : view === "tyden" ? (
                <WeekView
                  data={data}
                  appts={appts}
                  date={date}
                  onOpen={(a) => setSelectedId(a.id)}
                  onDay={goDay}
                  dayLabels={dayLabels}
                  colorOf={colorOf}
                />
              ) : (
                <MonthView appts={appts} date={date} onDay={goDay} dayLabels={dayLabels} />
              )}
            </CardContent>
          </Card>
        );
      })}
      <AppointmentQuickView
        appointment={selectedAppointment}
        data={data}
        onClose={() => setSelectedId(null)}
        onEdit={(appointment) => {
          setSelectedId(null);
          openAppointment(appointment);
        }}
      />
    </div>
  );
}

function DayView({
  data,
  groomers,
  appts,
  onNew,
  onOpen,
  colorOf,
  tr,
  t,
}: {
  colorOf: (id: string) => string;
  data: CrmData;
  groomers: Groomer[];
  appts: Appointment[];
  date: string;
  onNew: (groomerId: string, time: string) => void;
  onOpen: (a: Appointment) => void;
  tr: (value: string) => string;
  t: (key: "newVisit" | "noGroomersInSalon") => string;
}) {
  if (!groomers.length)
    return <p className="text-sm text-muted-foreground">{t("noGroomersInSalon")}</p>;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[600px]">
        <div className="w-14 shrink-0">
          <div className="h-8" />
          {HOURS.map((h) => (
            <div
              key={h}
              className="border-t pr-2 text-right text-xs text-muted-foreground"
              style={{ height: ROW_H }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {groomers.map((g) => (
          <div key={g.id} className="min-w-0 flex-1 border-l">
            <div className="flex h-8 items-center justify-center gap-1.5 text-sm font-medium">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(g.id) }} />
              {g.name}
            </div>
            <div className="relative" style={{ height: HOURS.length * ROW_H }}>
              {HOURS.map((h, i) => (
                <button
                  key={h}
                  onClick={() => onNew(g.id, `${String(h).padStart(2, "0")}:00`)}
                  className="absolute left-0 w-full border-t hover:bg-accent/50"
                  style={{ top: i * ROW_H, height: ROW_H }}
                  aria-label={`${t("newVisit")} ${g.name} ${h}:00`}
                />
              ))}
              {appts
                .filter((a) => a.groomer_id === g.id)
                .map((a) => {
                  const [hh, mm] = a.time.split(":").map(Number);
                  const top = (((hh ?? 9) - 9) * 60 + (mm ?? 0)) * (ROW_H / 60);
                  const height = Math.max(24, (a.planned_duration || 30) * (ROW_H / 60));
                  return (
                    <button
                      key={a.id}
                      onClick={() => onOpen(a)}
                      className="absolute left-1 right-1 overflow-hidden rounded border border-l-4 p-1 text-left text-xs hover:brightness-95"
                      style={{
                        top,
                        height,
                        borderColor: colorOf(g.id),
                        backgroundColor: `color-mix(in srgb, ${colorOf(g.id)} 14%, var(--background))`,
                      }}
                    >
                      <div className="font-medium">
                        {a.time} {data.dogs.find((d) => d.id === a.dog_id)?.name}
                      </div>
                      <div className="truncate text-muted-foreground">
                        {translatedServiceNames(data, a.serviceIds, tr)}
                      </div>
                      <div className="text-muted-foreground">{tr(a.status)}</div>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView({
  data,
  appts,
  date,
  onOpen,
  onDay,
  dayLabels,
  colorOf,
}: {
  colorOf: (id: string) => string;
  data: CrmData;
  appts: Appointment[];
  date: Date;
  onOpen: (a: Appointment) => void;
  onDay: (iso: string) => void;
  dayLabels: string[];
}) {
  const start = mondayOf(date);
  const days = Array.from({ length: 7 }, (_, i) => toISO(addDays(start, i)));
  return (
    <div className="grid grid-cols-7 gap-2 overflow-x-auto">
      {days.map((iso, i) => (
        <div key={iso} className="min-w-[110px]">
          <button
            onClick={() => onDay(iso)}
            className="mb-2 w-full rounded border px-1 py-1 text-xs hover:bg-accent"
          >
            {dayLabels[i]} {fromISO(iso).getDate()}.{fromISO(iso).getMonth() + 1}.
          </button>
          <div className="space-y-1">
            {appts
              .filter((a) => a.date === iso)
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((a) => (
                <button
                  key={a.id}
                  onClick={() => onOpen(a)}
                  className="w-full rounded border border-l-4 px-1 py-0.5 text-left text-[11px] hover:brightness-95"
                  style={{
                    borderColor: colorOf(a.groomer_id),
                    backgroundColor: `color-mix(in srgb, ${colorOf(a.groomer_id)} 14%, var(--background))`,
                  }}
                >
                  <div className="font-medium">
                    {a.time} {data.dogs.find((d) => d.id === a.dog_id)?.name}
                  </div>
                  <div className="truncate text-muted-foreground">
                    {data.groomers.find((g) => g.id === a.groomer_id)?.name}
                  </div>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthView({
  appts,
  date,
  onDay,
  dayLabels,
}: {
  appts: Appointment[];
  date: Date;
  onDay: (iso: string) => void;
  dayLabels: string[];
}) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = mondayOf(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const today = todayISO();
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {dayLabels.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const iso = toISO(d);
          const count = appts.filter((a) => a.date === iso).length;
          const otherMonth = d.getMonth() !== date.getMonth();
          return (
            <button
              key={iso}
              onClick={() => onDay(iso)}
              className={`h-16 rounded border p-1 text-left text-xs hover:bg-accent ${
                otherMonth ? "text-muted-foreground/50" : ""
              } ${iso === today ? "border-primary bg-primary/5" : ""}`}
            >
              <div>{d.getDate()}</div>
              {count ? (
                <div className="mt-1 inline-block rounded bg-primary/15 px-1">{count}</div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

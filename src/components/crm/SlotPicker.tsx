import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { addDays, fromISO, mondayOf, toISO, todayISO, type CrmData } from "@/lib/crm";
import { allSlots, busyIntervals, periodOf } from "@/lib/booking";
import { useI18n } from "@/lib/i18n";

const HORIZONS = [3, 7, 14, 30];

function isWorking(data: CrmData, groomerId: string, date: string) {
  const d = fromISO(date);
  const ws = toISO(mondayOf(d));
  const dow = ((d.getDay() + 6) % 7) + 1;
  const v = data.shifts.find((s) => s.groomer_id === groomerId && s.week_start === ws && s.day_of_week === dow)?.value;
  return !!v && v !== "Volno";
}

export function slotsFor(data: CrmData, groomerId: string, date: string, duration: number, excludeId?: string) {
  if (!isWorking(data, groomerId, date)) return [];
  const now = new Date();
  const notBefore = date === todayISO() ? now.getHours() * 60 + now.getMinutes() : 0;
  return allSlots(busyIntervals(excludeId ? data.appointments.filter((a) => a.id !== excludeId) : data.appointments, groomerId, date), duration, notBefore);
}

/** Day buttons + grouped free time slots (same UI as Quick Booking). */
export function SlotPicker({
  data,
  groomerId,
  duration,
  date,
  time,
  onChange,
  excludeId,
}: {
  excludeId?: string;
  data: CrmData;
  groomerId: string;
  duration: number;
  date: string;
  time: string;
  onChange: (date: string, time: string) => void;
}) {
  const { t, dateLocale } = useI18n();
  const [horizon, setHorizon] = useState(3);
  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < horizon; i++) out.push(toISO(addDays(new Date(), i)));
    return out;
  }, [horizon]);

  useEffect(() => {
    if (!groomerId) return;
    const first = days.find((d) => slotsFor(data, groomerId, d, duration, excludeId).length);
    onChange(date && days.includes(date) && slotsFor(data, groomerId, date, duration, excludeId).length ? date : first ?? "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groomerId, horizon, duration]);

  const fmtDay = (iso: string) =>
    fromISO(iso).toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" });
  const daySlots = groomerId && date ? slotsFor(data, groomerId, date, duration, excludeId) : [];
  const groups = (["morning", "afternoon", "evening"] as const).map((p) => ({
    p,
    slots: daySlots.filter((s) => periodOf(s.time) === p),
  }));

  if (!groomerId) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {days.map((d) => {
          const n = slotsFor(data, groomerId, d, duration, excludeId).length;
          return (
            <button key={d} type="button" disabled={!n} onClick={() => onChange(d, "")}
              className={`rounded-md border px-2 py-1 text-xs ${d === date ? "bg-primary text-primary-foreground" : "bg-muted/40"} ${!n ? "opacity-40" : ""}`}>
              <div>{fmtDay(d)}</div>
              <div className="text-[10px]">{n ? `${n} ${t("slotsShort")}` : t("dayOff")}</div>
            </button>
          );
        })}
        {horizon < HORIZONS[HORIZONS.length - 1]! ? (
          <Button type="button" size="sm" variant="outline"
            onClick={() => setHorizon(HORIZONS.find((h) => h > horizon) ?? horizon)}>
            {t("showMoreDays")}
          </Button>
        ) : null}
      </div>
      {!days.some((d) => slotsFor(data, groomerId, d, duration, excludeId).length) ? (
        <div className="text-sm text-muted-foreground">{t("noSlotsHint")}</div>
      ) : null}
      {date ? (
        <div className="space-y-2 rounded border p-3">
          <div className="text-sm font-medium">{fmtDay(date)}</div>
          <div className="text-xs text-muted-foreground">⭐ {t("bestSlotHint")}</div>
          {groups.map(({ p, slots }) =>
            slots.length ? (
              <div key={p}>
                <div className="mb-1 text-xs uppercase text-muted-foreground">{t(p)} · {slots.length}</div>
                <div className="flex flex-wrap gap-2">
                  {slots.map(({ time: s, best }) => (
                    <Button key={s} type="button" size="sm" variant={s === time ? "default" : "outline"}
                      onClick={() => onChange(date, s)}
                      className={best && s !== time ? "border-primary font-semibold" : ""}>
                      {best ? "⭐ " : ""}{s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}

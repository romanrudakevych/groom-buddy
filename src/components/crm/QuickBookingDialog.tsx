import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pick, opts } from "./Pick";
import { Field } from "./ui";
import { supabase } from "@/integrations/supabase/client";
import {
  SIZES,
  addDays,
  fromISO,
  mondayOf,
  saveAppointment,
  servicePriceForDog,
  toISO,
  todayISO,
  useCrm,
  useCrmMutation,
  type CrmData,
  type Dog,
} from "@/lib/crm";
import { allSlots, busyIntervals, periodOf, previousDuration } from "@/lib/booking";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

const DEFAULT_SERVICE = "Kompletní péče";
const HORIZONS = [3, 7, 14, 30];

function isWorking(data: CrmData, groomerId: string, date: string) {
  const d = fromISO(date);
  const ws = toISO(mondayOf(d));
  const dow = ((d.getDay() + 6) % 7) + 1;
  const v = data.shifts.find((s) => s.groomer_id === groomerId && s.week_start === ws && s.day_of_week === dow)?.value;
  return !!v && v !== "Volno";
}

function slotsFor(data: CrmData, groomerId: string, date: string, duration: number) {
  if (!isWorking(data, groomerId, date)) return [];
  const now = new Date();
  const notBefore = date === todayISO() ? now.getHours() * 60 + now.getMinutes() : 0;
  return allSlots(busyIntervals(data.appointments, groomerId, date), duration, notBefore);
}

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

export function QuickBookingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data } = useCrm();
  const { t, tr, dateLocale } = useI18n();
  const [q, setQ] = useState("");
  const [dogId, setDogId] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [nd, setNd] = useState({ dog: "", breed: "", size: "Střední", owner: "", phone: "" });
  const [groomerId, setGroomerId] = useState("");
  const [changeGroomer, setChangeGroomer] = useState(false);
  const [salonId, setSalonId] = useState("");
  const [changeSalon, setChangeSalon] = useState(false);
  const [horizon, setHorizon] = useState(3);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ(""); setDogId(""); setIsNew(false); setGroomerId(""); setChangeGroomer(false);
    setSalonId(""); setChangeSalon(false);
    setHorizon(3); setDate(""); setTime("");
    setNd({ dog: "", breed: "", size: "Střední", owner: "", phone: "" });
  }, [open]);

  const dog: Dog | undefined = data.dogs.find((d) => d.id === dogId);
  const owner = dog ? data.clients.find((c) => c.id === dog.owner_id) : undefined;
  const defService = data.services.find((s) => s.name === DEFAULT_SERVICE);
  const fallback = { duration: defService?.duration_minutes ?? 120, serviceIds: defService ? [defService.id] : [] };
  const dur = dog ? previousDuration(data.appointments, dog.id, fallback) : { ...fallback, fromDate: null };

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const qd = digits(s);
    return data.dogs
      .filter((d) => {
        const o = data.clients.find((c) => c.id === d.owner_id);
        const phones = [o?.phone, ...(o?.additional_contacts ?? []).map((c) => c.phone)];
        const names = [d.name, o?.name, ...(o?.additional_contacts ?? []).map((c) => c.name)];
        return (
          names.some((n) => n?.toLowerCase().includes(s)) ||
          (qd.length >= 3 && phones.some((p) => digits(p).includes(qd)))
        );
      })
      .slice(0, 8);
  }, [q, data]);

  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < horizon; i++) out.push(toISO(addDays(new Date(), i)));
    return out;
  }, [horizon]);

  const monthKey = todayISO().slice(0, 7);
  const rankAll = useMemo(
    () =>
      data.groomers
        .map((g) => {
          const first = days.find((d) => slotsFor(data, g.id, d, dur.duration).length);
          const monthCount = data.appointments.filter(
            (a) => a.groomer_id === g.id && a.date.startsWith(monthKey) && a.status !== "Zrušeno",
          ).length;
          return { g, first, monthCount };
        })
        .sort((a, b) => (a.first ?? "9999").localeCompare(b.first ?? "9999") || a.monthCount - b.monthCount),
    [data, days, dur.duration, monthKey],
  );
  // groomer ranking filtered to the selected salon
  const ranking = useMemo(() => rankAll.filter((r) => r.g.salon_id === salonId), [rankAll, salonId]);
  const bestInSalon = (sid: string) => rankAll.find((r) => r.g.salon_id === sid)?.g.id ?? "";

  // auto-pick salon + groomer: pinned groomer (and its salon) for existing dog, best-ranked for new dog
  useEffect(() => {
    if (!dog && !isNew) return;
    const pinnedG = dog?.pinned_groomer_id
      ? data.groomers.find((g) => g.id === dog.pinned_groomer_id)
      : undefined;
    if (pinnedG) {
      setSalonId(pinnedG.salon_id);
      setGroomerId(pinnedG.id);
    } else {
      const sid =
        (dog ? data.clients.find((c) => c.id === dog.owner_id)?.preferred_salon_id : "") ||
        data.salons[0]?.id ||
        "";
      setSalonId(sid);
      setGroomerId(bestInSalon(sid));
    }
    setDate(""); setTime("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dogId, isNew]);

  const changeSalonTo = (sid: string) => {
    setSalonId(sid);
    setGroomerId(bestInSalon(sid));
    setChangeSalon(false);
    setDate(""); setTime("");
  };

  useEffect(() => {
    if (!groomerId) return;
    const first = days.find((d) => slotsFor(data, groomerId, d, dur.duration).length);
    setDate((cur) => (cur && days.includes(cur) ? cur : first ?? ""));
    setTime("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groomerId, horizon]);

  const daySlots = groomerId && date ? slotsFor(data, groomerId, date, dur.duration) : [];
  const groomer = data.groomers.find((g) => g.id === groomerId);
  const salonName = (id: string) => data.salons.find((s) => s.id === id)?.name ?? "";
  const fmtDay = (iso: string) =>
    fromISO(iso).toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" });

  const save = useCrmMutation(async () => {
    let id = dogId;
    if (isNew) {
      const { data: c, error: ce } = await supabase
        .from("clients")
        .insert({ name: nd.owner.trim(), phone: nd.phone.trim() || null, preferred_salon_id: groomer?.salon_id ?? null })
        .select("id")
        .single();
      if (ce) throw ce;
      const { data: d, error: de } = await supabase
        .from("dogs")
        .insert({ name: nd.dog.trim(), breed: nd.breed.trim() || null, size: nd.size, owner_id: c.id, pinned_groomer_id: groomerId })
        .select("id")
        .single();
      if (de) throw de;
      id = d.id;
    } else if (dog && !dog.pinned_groomer_id) {
      const { error } = await supabase.from("dogs").update({ pinned_groomer_id: groomerId }).eq("id", dog.id);
      if (error) throw error;
    }
    const chosen = data.services.filter((s) => dur.serviceIds.includes(s.id));
    const price = chosen.reduce((a, s) => a + servicePriceForDog(s, dog), 0);
    await saveAppointment(
      {
        dog_id: id, groomer_id: groomerId, date, time, status: "Naplánováno",
        actual_duration: null, behavior_during_visit: null, notes: "", paid_by_card: false,
        serviceIds: dur.serviceIds, price, planned_duration: dur.duration,
      },
      data.services,
    );
  });

  const canSave =
    !!groomerId && !!date && !!time && (isNew ? !!nd.dog.trim() && !!nd.owner.trim() && !!nd.phone.trim() : !!dogId);

  const groups = (["morning", "afternoon", "evening"] as const).map((p) => ({
    p, slots: daySlots.filter((s) => periodOf(s.time) === p),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>⚡ {t("quickBooking")}</DialogTitle>
        </DialogHeader>

        {/* Step 1: who */}
        {!dog && !isNew ? (
          <div className="space-y-2">
            <Input autoFocus placeholder={t("quickSearchPh")} value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="divide-y rounded border">
              {results.map((d) => {
                const o = data.clients.find((c) => c.id === d.owner_id);
                const g = data.groomers.find((x) => x.id === d.pinned_groomer_id);
                return (
                  <button key={d.id} type="button" onClick={() => setDogId(d.id)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent">
                    <span className="font-medium">{d.name}</span>
                    {d.breed ? <span className="text-muted-foreground"> ({d.breed})</span> : null}
                    <span className="text-muted-foreground"> · {o?.name ?? "—"} {o?.phone ?? ""}</span>
                    {g ? <span className="text-muted-foreground"> · ✂️ {g.name}</span> : null}
                  </button>
                );
              })}
              {q.trim().length >= 2 && !results.length ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">{t("noDogFound")}</div>
              ) : null}
            </div>
            <Button type="button" variant="outline" onClick={() => { setIsNew(true); setNd((n) => ({ ...n, dog: /\d/.test(q) ? "" : q.trim(), phone: /\d/.test(q) ? q.trim() : "" })); }}>
              + {t("newDogAndOwner")}
            </Button>
          </div>
        ) : (
          <div className="rounded border bg-muted/40 p-2 text-sm">
            {dog ? (
              <div><span className="font-medium">{dog.name}</span>{dog.breed ? ` (${dog.breed})` : ""} · {owner?.name} {owner?.phone}</div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label={t("dogName")} required><Input value={nd.dog} onChange={(e) => setNd({ ...nd, dog: e.target.value })} /></Field>
                <Field label={t("breed")}><Input value={nd.breed} onChange={(e) => setNd({ ...nd, breed: e.target.value })} /></Field>
                <Field label={t("size")}><Pick value={nd.size} onChange={(v) => setNd({ ...nd, size: v })} options={opts(SIZES, tr)} /></Field>
                <div />
                <Field label={t("ownerName")} required><Input value={nd.owner} onChange={(e) => setNd({ ...nd, owner: e.target.value })} /></Field>
                <Field label={t("phone")} required><Input value={nd.phone} onChange={(e) => setNd({ ...nd, phone: e.target.value })} /></Field>
              </div>
            )}
            <button type="button" className="mt-1 text-xs text-muted-foreground underline"
              onClick={() => { setDogId(""); setIsNew(false); setGroomerId(""); }}>
              {t("changeDog")}
            </button>
          </div>
        )}

        {/* Step 2: groomer + duration */}
        {dog || isNew ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{t("salon")}:</span>
              {changeSalon ? (
                <Pick
                  value={salonId}
                  onChange={changeSalonTo}
                  options={data.salons.map((s) => ({ value: s.id, label: s.name }))}
                  className="h-8 w-auto min-w-40"
                />
              ) : (
                <span className="font-medium">{salonName(salonId) || "—"}</span>
              )}
              <Button type="button" size="sm" variant="ghost" onClick={() => setChangeSalon((v) => !v)}>
                {t("changeSalon")}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{t("groomer")}:</span>
              <span className="font-medium">{groomer?.name ?? "—"}</span>
              {dog?.pinned_groomer_id === groomerId && groomerId ? <span className="rounded bg-accent px-1.5 text-xs">{t("pinnedGroomer")}</span> : null}
              <Button type="button" size="sm" variant="ghost" onClick={() => setChangeGroomer((v) => !v)}>{t("changeGroomer")}</Button>
            </div>
            {changeGroomer || (isNew && !groomerId) ? (
              <div className="grid gap-1 sm:grid-cols-2">
                {ranking.map(({ g, first, monthCount }, i) => (
                  <button key={g.id} type="button"
                    onClick={() => { setGroomerId(g.id); setChangeGroomer(false); }}
                    className={`rounded border px-2 py-1 text-left hover:bg-accent ${g.id === groomerId ? "border-primary" : ""}`}>
                    <div className="font-medium">{g.name} <span className="text-xs text-muted-foreground">· {salonName(g.salon_id)}</span>{i === 0 ? " ⭐" : ""}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("nearestSlot")}: {first ? fmtDay(first) : "—"} · {t("visitsThisMonth")}: {monthCount}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
            <div>
              <span className="text-muted-foreground">{t("duration")}: </span>
              <span className="font-medium">{dur.duration} {t("min")}</span>
              <span className="text-muted-foreground">
                {" "}· {dur.fromDate ? `${t("asLastTime")} ${fmtDay(dur.fromDate)}` : tr(DEFAULT_SERVICE)}
              </span>
            </div>
          </div>
        ) : null}

        {/* Step 3: day + slots */}
        {groomerId && (dog || isNew) ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {days.map((d) => {
                const n = slotsFor(data, groomerId, d, dur.duration).length;
                return (
                  <button key={d} type="button" disabled={!n} onClick={() => { setDate(d); setTime(""); }}
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
            {!days.some((d) => slotsFor(data, groomerId, d, dur.duration).length) ? (
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
                          <Button key={s} type="button" size="sm" variant={s === time ? "default" : "outline"} onClick={() => setTime(s)}
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
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button disabled={!canSave || save.isPending}
            onClick={() => save.mutate(undefined, {
              onSuccess: () => { toast.success(t("bookedOk")); onOpenChange(false); },
              onError: (e) => toast.error(String((e as Error).message ?? e)),
            })}>
            {t("book")}{time ? ` ${time}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

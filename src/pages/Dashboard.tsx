import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, MessageSquare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented, StatusTag } from "@/components/crm/ui";
import { useDialogs } from "@/components/crm/DialogProvider";
import { GroomerCardDialog } from "@/components/crm/GroomerCardDialog";
import { AppointmentQuickView } from "@/components/crm/AppointmentQuickView";
import {
  addDays,
  czk,
  dayCash,
  drawerBalance,
  fromISO,
  saveCashClosing,
  setAppointmentStatus,
  toISO,
  todayISO,
  useCrm,
  useCrmMutation,
  type Appointment,
  type CrmData,
} from "@/lib/crm";
import { translatedServiceNames, useI18n } from "@/lib/i18n";


const ACTIVE = ["Naplánováno", "Potvrzeno", "Dokončeno"];

export function Dashboard() {
  const { data, ready } = useCrm();
  const { t, dateLocale } = useI18n();
  const { openAppointment } = useDialogs();
  const [salon, setSalon] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const today = todayISO();
  const tomorrow = toISO(addDays(fromISO(today), 1));
  const salonOf = (a: Appointment) =>
    data.groomers.find((g) => g.id === a.groomer_id)?.salon_id ?? "";
  const forDay = (d: string) =>
    data.appointments
      .filter((a) => a.date === d && (salon === "all" || salonOf(a) === salon))
      .sort((a, b) => a.time.localeCompare(b.time));

  const todays = forDay(today);
  const tomorrows = forDay(tomorrow).filter((a) => ACTIVE.includes(a.status));
  const confirmed = tomorrows.filter((a) => a.status === "Potvrzeno").length;
  const selected = data.appointments.find((a) => a.id === selectedId) ?? null;
  const dayLabel = (d: string) =>
    fromISO(d).toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" });
  const cashSalons = data.salons.filter((s) => salon === "all" || s.id === salon);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("adminPanel")}</h1>
          <p className="text-sm capitalize text-muted-foreground">{dayLabel(today)}</p>
        </div>
        <Segmented
          value={salon}
          onChange={setSalon}
          options={[
            { value: "all", label: t("bothSalons") },
            ...data.salons.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
      </div>

      {!ready ? <p className="text-sm text-muted-foreground">{t("loadingData")}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {t("todayList")} · <span className="capitalize">{dayLabel(today)}</span>
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {todays.length} {t("visitsWord")}
            </span>
          </CardHeader>
          <CardContent>
            {todays.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noVisitsToday")}</p>
            ) : (
              <div className="divide-y">
                {todays.map((a) => (
                  <TodayRow key={a.id} a={a} data={data} onOpen={() => setSelectedId(a.id)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {t("tomorrowList")} · <span className="capitalize">{dayLabel(tomorrow)}</span>
            </CardTitle>
            <span className="text-sm font-medium">
              {t("confirmedOf")}: {confirmed}/{tomorrows.length}
            </span>
          </CardHeader>
          <CardContent>
            {tomorrows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noVisitsTomorrow")}</p>
            ) : (
              <div className="divide-y">
                {tomorrows.map((a) => (
                  <TomorrowRow key={a.id} a={a} data={data} onOpen={() => setSelectedId(a.id)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">
          {t("cashDay")} · <span className="capitalize">{dayLabel(today)}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{t("pickSalonForCash")}</p>
        <div className="grid gap-6 lg:grid-cols-2">
          {cashSalons.map((s) => (
            <CashBlock key={s.id} data={data} salonId={s.id} salonName={s.name} date={today} />
          ))}
        </div>
      </div>

      <AppointmentQuickView
        appointment={selected}
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

function TodayRow({ a, data, onOpen }: { a: Appointment; data: CrmData; onOpen: () => void }) {
  const { t, tr } = useI18n();
  const dog = data.dogs.find((d) => d.id === a.dog_id);
  const groomer = data.groomers.find((g) => g.id === a.groomer_id);
  const [cardOpen, setCardOpen] = useState(false);
  return (
    <div className="flex w-full items-center gap-3 px-1 py-2.5 text-sm hover:bg-accent">
      <span className="w-12 shrink-0 text-base font-semibold tabular-nums">{a.time}</span>
      <button
        type="button"
        onClick={() => setCardOpen(true)}
        title={t("openGroomerCard")}
        aria-label={t("openGroomerCard")}
        className="shrink-0 rounded-full ring-offset-2 hover:ring-2 hover:ring-primary"
      >
        {dog?.photo_url ? (
          <img src={dog.photo_url} alt={dog.name} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-xl">📷</span>
        )}
      </button>
      <button type="button" onClick={onOpen} title={t("tapForDetails")} className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          {dog?.name ?? "—"}
          {dog?.breed ? <span className="font-normal text-muted-foreground"> · {dog.breed}</span> : null}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {groomer?.name ?? "—"} · {translatedServiceNames(data, a.serviceIds, tr)} · {a.planned_duration}{" "}
          {t("minuteShort")}
        </span>
      </span>
      <StatusTag status={a.status} />
      </button>
      {dog && cardOpen ? <GroomerCardDialog dog={dog} data={data} onClose={() => setCardOpen(false)} /> : null}
    </div>
  );
}

function TomorrowRow({ a, data, onOpen }: { a: Appointment; data: CrmData; onOpen: () => void }) {
  const { t, tr } = useI18n();
  const dog = data.dogs.find((d) => d.id === a.dog_id);
  const owner = data.clients.find((c) => c.id === dog?.owner_id);
  const groomer = data.groomers.find((g) => g.id === a.groomer_id);
  const salonName = data.salons.find((s) => s.id === groomer?.salon_id)?.name ?? "";
  const isConfirmed = a.status === "Potvrzeno";
  const toggle = useCrmMutation((next: boolean) =>
    setAppointmentStatus(a.id, next ? "Potvrzeno" : "Naplánováno"),
  );
  const phone = owner?.phone ?? "";
  const digits = phone.replace(/\D/g, "");
  const template = owner?.language === "CZE" ? t("reminderTemplateCs") : t("reminderTemplateRu");
  const text = template
    .replace("{dog}", dog?.name ?? "")
    .replace("{time}", a.time)
    .replace("{salon}", salonName);
  const msg = encodeURIComponent(text);

  return (
    <div className="flex flex-wrap items-center gap-3 px-1 py-2.5 text-sm">
      <Checkbox
        checked={isConfirmed}
        disabled={toggle.isPending || a.status === "Dokončeno"}
        aria-label={t("confirmVisit")}
        onCheckedChange={(v) =>
          toggle.mutate(v === true, { onError: (e) => toast.error((e as Error).message) })
        }
        className="h-5 w-5"
      />
      <span className="w-12 shrink-0 font-semibold tabular-nums">{a.time}</span>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left hover:underline">
        <span className="block font-medium">
          {dog?.name ?? "—"}
          <span className="font-normal text-muted-foreground"> · {owner?.name ?? "—"}</span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {groomer?.name ?? "—"} · {translatedServiceNames(data, a.serviceIds, tr)}
        </span>
      </button>
      <StatusTag status={a.status} />
      {digits.length >= 5 ? (
        <div className="flex gap-1">
          <Button asChild size="sm" variant="whatsapp" aria-label={t("whatsapp")}>
            <a href={`https://wa.me/${digits}?text=${msg}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle />
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" aria-label={t("sms")}>
            <a href={`sms:${phone}?body=${msg}`}>
              <MessageSquare />
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" aria-label={t("call")}>
            <a href={`tel:${phone}`}>
              <Phone />
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CashBlock({
  data,
  salonId,
  salonName,
  date,
}: {
  data: CrmData;
  salonId: string;
  salonName: string;
  date: string;
}) {
  const { t } = useI18n();
  const day = dayCash(data, salonId, date);
  const expected = drawerBalance(data, salonId, date);
  const closing = (data.closings ?? []).find((c) => c.salon_id === salonId && c.date === date);
  const [counted, setCounted] = useState<string>(closing ? String(closing.counted) : "");
  const [note, setNote] = useState(closing?.note ?? "");
  const countedNum = counted === "" ? null : Number(counted);
  const diff = countedNum === null ? null : countedNum - expected;
  const save = useCrmMutation(() =>
    saveCashClosing({ salon_id: salonId, date, expected, counted: countedNum ?? 0, note }),
  );

  const row = (label: string, value: string, strong = false) => (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{salonName}</CardTitle>
        {closing ? (
          <span className="rounded border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
            {t("cashConfirmed")}
          </span>
        ) : (
          <span className="rounded border bg-muted px-2 py-0.5 text-xs">{t("cashNotConfirmed")}</span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          {row(t("cashFromVisits"), czk(day.visitsCash))}
          {row(t("cashDeposits"), czk(day.deposits))}
          {row(t("cashOutflows"), `−${czk(day.outflows)}`)}
          {row(t("cardToday"), czk(day.card))}
          <div className="border-t pt-1">{row(t("cashExpected"), czk(expected), true)}</div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder={t("cashCounted")}
            aria-label={t("cashCounted")}
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
          />
          <Input placeholder={t("note")} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {diff !== null ? (
          <div
            className={
              diff === 0 ? "text-sm text-emerald-700" : "text-sm font-semibold text-destructive"
            }
          >
            {t("cashDifference")}: {diff > 0 ? "+" : ""}
            {czk(diff)}
          </div>
        ) : null}
        <Button
          className="w-full"
          disabled={countedNum === null || Number.isNaN(countedNum) || save.isPending}
          onClick={() =>
            save.mutate(undefined, {
              onSuccess: () => toast.success(t("cashConfirmed")),
              onError: (e) => toast.error((e as Error).message),
            })
          }
        >
          {closing ? t("cashReconfirm") : t("cashConfirm")}
        </Button>
      </CardContent>
    </Card>
  );
}

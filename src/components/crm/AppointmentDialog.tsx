import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pick, opts } from "./Pick";
import { SearchPick } from "./SearchPick";
import { DogDialog } from "./DogDialog";
import { CheckList, Field } from "./ui";
import { SlotPicker } from "./SlotPicker";
import { previousDuration } from "@/lib/booking";
import { useAuth } from "@/lib/auth";

import {
  BEHAVIORS,
  STATUSES,
  czk,
  canDeleteAppointment,
  deleteAppointment,
  formatDate,
  isAppointmentLocked,
  saveAppointment,
  saveLockedAppointmentNotes,
  todayISO,
  useCrm,
  useCrmMutation,
  type Appointment,
  type AppointmentInput,
  servicePriceForDog,
} from "@/lib/crm";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type AppointmentPreset = Partial<
  Pick<AppointmentInput, "dog_id" | "groomer_id" | "date" | "time" | "status">
>;

const base = (preset?: AppointmentPreset): AppointmentInput => ({
  dog_id: preset?.dog_id ?? "",
  groomer_id: preset?.groomer_id ?? "",
  date: preset?.date ?? todayISO(),
  time: preset?.time ?? "09:00",
  status: preset?.status ?? "Naplánováno",
  actual_duration: null,
  behavior_during_visit: null,
  notes: "",
  paid_by_card: false,
  serviceIds: [],
});

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  preset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment?: Appointment | null;
  preset?: AppointmentPreset | undefined;
}) {
  const { data } = useCrm();
  const { can } = useAuth();
  const canPlan = can("appointments_create");
  const { t, tr } = useI18n();
  const [form, setForm] = useState<AppointmentInput>(base());
  const [dogOpen, setDogOpen] = useState(false);
  const [newDogName, setNewDogName] = useState("");


  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setForm({
        id: appointment.id,
        dog_id: appointment.dog_id,
        groomer_id: appointment.groomer_id,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
        actual_duration: appointment.actual_duration,
        behavior_during_visit: appointment.behavior_during_visit,
        haircut_notes: appointment.haircut_notes ?? "",
        notes: appointment.notes ?? "",
        paid_by_card: appointment.paid_by_card,
        serviceIds: appointment.serviceIds,
        price: appointment.price,
      });
    } else {
      setForm(base(preset));
    }
  }, [open, appointment, preset]);

  const chosen = useMemo(
    () => data.services.filter((s) => form.serviceIds.includes(s.id)),
    [data.services, form.serviceIds],
  );
  const duration = chosen.reduce((a, s) => a + s.duration_minutes, 0);
  const selDogForPrice = data.dogs.find((d) => d.id === form.dog_id);
  const listPrice = chosen.reduce((a, s) => a + servicePriceForDog(s, selDogForPrice), 0);
  const [priceTouched, setPriceTouched] = useState(false);
  const price = priceTouched && form.price != null ? form.price : listPrice;
  const [manualTime, setManualTime] = useState(true);
  const [durOverride, setDurOverride] = useState<number | null>(null);
  useEffect(() => {
    if (open) {
      setPriceTouched(!!appointment);
      setManualTime(true);
      setDurOverride(appointment?.planned_duration ?? null);
    }
  }, [open, appointment]);

  const isNewVisit = !appointment;
  const prevDur = form.dog_id
    ? previousDuration(data.appointments, form.dog_id, { duration: duration || 120, serviceIds: [] })
    : null;
  const autoDuration = prevDur?.fromDate ? prevDur.duration : duration || 120;
  const slotDuration = durOverride ?? autoDuration;

  const locked = isAppointmentLocked(appointment);
  const mutation = useCrmMutation(async () =>
    locked && appointment
      ? saveLockedAppointmentNotes(appointment.id, form.notes, form.haircut_notes ?? "")
      : saveAppointment({ ...form, price, planned_duration: slotDuration }, data.services),
  );
  const del = useCrmMutation((id: string) => deleteAppointment(id));

  const selDog = data.dogs.find((d) => d.id === form.dog_id);
  const completed = form.status === "Dokončeno";
  const canSave =
    !!form.dog_id &&
    !!form.groomer_id &&
    !!form.date &&
    !!form.time &&
    form.serviceIds.length > 0 &&
    (!completed || (!!form.actual_duration && !!form.behavior_during_visit));

  const submit = () =>
    mutation.mutate(undefined as never, {
      onSuccess: () => {
        toast.success(appointment ? t("visitUpdated") : t("visitCreated"));
        onOpenChange(false);
      },
      onError: (e: unknown) => toast.error(`${t("saveFailed")}: ${String(e)}`),
    });

  const salonName = (id: string) => data.salons.find((s) => s.id === id)?.name ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{appointment ? t("editVisit") : t("newVisit")}</DialogTitle>
        </DialogHeader>

        {locked && appointment ? (
          <div className="space-y-3">
            <div className="rounded border bg-muted/40 p-2 text-sm">🔒 {t("visitLocked")}</div>
            <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">{t("dog")}: </span>{selDog?.name ?? "—"}</div>
              <div><span className="text-muted-foreground">{t("groomer")}: </span>{data.groomers.find((g) => g.id === appointment.groomer_id)?.name ?? "—"}</div>
              <div><span className="text-muted-foreground">{t("date")}: </span>{formatDate(appointment.date)} {appointment.time}</div>
              <div><span className="text-muted-foreground">{t("status")}: </span>{tr(appointment.status)}</div>
              <div className="sm:col-span-2"><span className="text-muted-foreground">{t("services")}: </span>{chosen.map((x) => tr(x.name)).join(", ") || "—"}</div>
              <div><span className="text-muted-foreground">{t("priceAuto")}: </span>{czk(appointment.price)}{appointment.paid_by_card ? ` · ${t("paidByCard")}` : ""}</div>
              <div><span className="text-muted-foreground">{t("actualDurationMin")}: </span>{appointment.actual_duration ?? "—"}</div>
              <div><span className="text-muted-foreground">{t("behaviorDuringVisit")}: </span>{appointment.behavior_during_visit ? tr(appointment.behavior_during_visit) : "—"}</div>
            </div>
            <Field label={t("haircutNotes")}>
              <Textarea value={form.haircut_notes ?? ""} placeholder={t("haircutNotesHint")}
                onChange={(e) => setForm({ ...form, haircut_notes: e.target.value })} />
            </Field>
            <Field label={t("notes")}>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
        ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("dog")} required>
            <SearchPick
              value={form.dog_id}
              onChange={(v) => {
                const d = data.dogs.find((x) => x.id === v);
                setForm((f) => ({
                  ...f,
                  dog_id: v,
                  groomer_id: !f.id && d?.pinned_groomer_id ? d.pinned_groomer_id : f.groomer_id,
                }));
              }}
              options={data.dogs.map((d) => ({
                value: d.id,
                label: `${d.name}${d.breed ? ` (${d.breed})` : ""}`,
              }))}
              placeholder={t("pickDog")}
              searchPlaceholder={t("searchDog")}
              emptyText={t("noDogFound")}
              createLabel={t("addNewDog")}
              onCreate={(q) => {
                setNewDogName(q);
                setDogOpen(true);
              }}
            />
          </Field>

          {selDog && (selDog.grooming_instructions || selDog.preferred_additional_services.length || selDog.pinned_groomer_id) ? (
            <div className="space-y-1 rounded border bg-muted/40 p-2 text-sm sm:col-span-2">
              {selDog.pinned_groomer_id ? (
                <div>
                  <span className="text-muted-foreground">{t("pinnedGroomer")}: </span>
                  {data.groomers.find((g) => g.id === selDog.pinned_groomer_id)?.name}
                </div>
              ) : null}
              {selDog.grooming_instructions ? (
                <div className="whitespace-pre-wrap">
                  <span className="text-muted-foreground">✂️ {t("groomingInstructions")}: </span>
                  {selDog.grooming_instructions}
                </div>
              ) : null}
              {selDog.preferred_additional_services.length ? (
                <div>
                  <span className="text-muted-foreground">{t("additionalServices")}: </span>
                  {selDog.preferred_additional_services
                    .map((id) => data.services.find((s) => s.id === id)?.name)
                    .filter(Boolean)
                    .map((n) => tr(n as string))
                    .join(", ")}
                </div>
              ) : null}
            </div>
          ) : null}

          <Field label={t("groomerDeterminesSalon")} required>
            <Pick
              value={form.groomer_id}
              onChange={(v) => setForm({ ...form, groomer_id: v })}
              options={data.groomers.map((g) => ({
                value: g.id,
                label: `${g.name} – ${salonName(g.salon_id)}`,
              }))}
              placeholder={t("pickGroomer")}
            />
          </Field>
          {isNewVisit ? (
            <div className="space-y-2 sm:col-span-2">
              <div className="text-sm">
                <span className="text-muted-foreground">{t("duration")}: </span>
                <span className="font-medium">{slotDuration} {t("min")}</span>
                {prevDur?.fromDate ? (
                  <span className="text-muted-foreground"> · {t("asLastTime")} {formatDate(prevDur.fromDate)}</span>
                ) : null}
              </div>
              {form.groomer_id ? (
                <SlotPicker
                  data={data}
                  groomerId={form.groomer_id}
                  duration={slotDuration}
                  date={form.date}
                  time={form.time}
                  onChange={(date, time) => setForm((f) => ({ ...f, date, time }))}
                />
              ) : (
                <div className="text-sm text-muted-foreground">{t("pickGroomer")}</div>
              )}
            </div>
          ) : !canPlan ? (
            <div className="text-sm sm:col-span-2">
              <span className="text-muted-foreground">{t("date")}: </span>
              <span className="font-medium">{appointment ? `${formatDate(appointment.date)} ${appointment.time}` : ""}</span>
            </div>
          ) : !manualTime ? (
            <div className="space-y-2 sm:col-span-2">
              <SlotPicker
                data={data}
                groomerId={form.groomer_id}
                duration={slotDuration}
                date={form.date}
                time={form.time}
                excludeId={appointment?.id}
                onChange={(date, time) => setForm((f) => ({ ...f, date, time }))}
              />
              <button type="button" className="text-xs text-muted-foreground underline" onClick={() => {
                setManualTime(true);
                if (appointment && (!form.date || !form.time)) setForm((f) => ({ ...f, date: f.date || appointment.date, time: f.time || appointment.time }));
              }}>
                {t("enterManually")}
              </button>
            </div>
          ) : (
            <>
              <Field label={t("date")} required>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label={t("time")} required>
                <Pick
                  value={form.time}
                  onChange={(v) => setForm({ ...form, time: v })}
                  options={Array.from({ length: 23 }, (_, i) => {
                    const h = 9 + Math.floor(i / 2);
                    const m = i % 2 ? "30" : "00";
                    const v = `${String(h).padStart(2, "0")}:${m}`;
                    return { value: v, label: v };
                  })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Button type="button" size="sm" variant="outline" disabled={!form.groomer_id} onClick={() => setManualTime(false)}>
                  {t("pickFreeSlot")}
                </Button>
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <Field label={t("services")} required>
              <CheckList
                items={data.services.map((s) => ({
                  id: s.id,
                  label: `${tr(s.name)} – ${s.duration_minutes} ${t("minuteShort")}, ${czk(servicePriceForDog(s, selDogForPrice))}`,
                }))}
                selected={form.serviceIds}
                onToggle={(id) =>
                  setForm((f) => ({
                    ...f,
                    serviceIds: f.serviceIds.includes(id)
                      ? f.serviceIds.filter((x) => x !== id)
                      : [...f.serviceIds, id],
                  }))
                }
              />
            </Field>
          </div>
          <Field label={t("plannedDurationAuto")}>
            <Input
              type="number"
              min={15}
              step={15}
              value={slotDuration}
              onChange={(e) => setDurOverride(Number(e.target.value) || null)}
            />
            {durOverride != null && durOverride !== autoDuration && (
              <button
                type="button"
                className="mt-1 text-xs text-muted-foreground underline"
                onClick={() => setDurOverride(null)}
              >
                {autoDuration} {t("minuteShort")} ↺
              </button>
            )}
          </Field>
          <Field label={t("priceAuto")}>
            <Input
              type="number"
              min={0}
              value={price}
              onChange={(e) => {
                setPriceTouched(true);
                setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }));
              }}
            />
            {price !== listPrice && (
              <button
                type="button"
                className="mt-1 text-xs text-muted-foreground underline"
                onClick={() => setPriceTouched(false)}
              >
                {czk(listPrice)} ↺
              </button>
            )}
          </Field>
          <Field label={t("status")} required>
            <Pick
              value={form.status}
              onChange={(v) =>
                setForm({
                  ...form,
                  status: v,
                  paid_by_card: v === "Dokončeno" ? form.paid_by_card : false,
                })
              }
              options={opts(STATUSES, tr)}
            />
          </Field>
          {completed ? (
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={form.paid_by_card}
                onChange={(e) => setForm({ ...form, paid_by_card: e.target.checked })}
              />
              {t("paidByCard")}
            </label>
          ) : null}
          {completed ? (
            <>
              <Field label={t("actualDurationMin")} required>
                <Input
                  type="number"
                  min={5}
                  value={form.actual_duration ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      actual_duration: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label={t("behaviorDuringVisit")} required>
                <Pick
                  value={form.behavior_during_visit ?? ""}
                  onChange={(v) => setForm({ ...form, behavior_during_visit: v || null })}
                  options={opts(BEHAVIORS, tr)}
                  placeholder={t("pickValue")}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t("haircutNotes")}>
                  <Textarea
                    value={form.haircut_notes ?? ""}
                    placeholder={t("haircutNotesHint")}
                    onChange={(e) => setForm({ ...form, haircut_notes: e.target.value })}
                  />
                </Field>
              </div>
            </>
          ) : null}
          <div className="sm:col-span-2">
            <Field label={t("notes")}>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
        </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
          {appointment && canDeleteAppointment() && can("appointments_delete") ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={del.isPending}>
                  <Trash2 />
                  {t("deleteVisit")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteVisit")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {selDog?.name ?? "—"} · {formatDate(appointment.date)} {appointment.time} ·{" "}
                    {data.groomers.find((g) => g.id === appointment.groomer_id)?.name ?? "—"}
                    <br />
                    {t("deleteVisitConfirm")}
                    {appointment.status === "Dokončeno" && (
                      <>
                        <br />
                        <strong>{t("deleteVisitDoneWarning")}</strong>
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() =>
                      del.mutate(appointment.id as never, {
                        onSuccess: () => {
                          toast.success(t("visitDeleted"));
                          onOpenChange(false);
                        },
                        onError: (e: unknown) => toast.error(String(e)),
                      })
                    }
                  >
                    {t("deleteVisit")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button disabled={(!locked && !canSave) || mutation.isPending} onClick={submit}>
              {t("save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      <DogDialog
        open={dogOpen}
        onOpenChange={setDogOpen}
        dog={null}
        initialName={newDogName}
        onCreated={(dogId, pinned) =>
          setForm((f) => ({ ...f, dog_id: dogId, groomer_id: pinned ?? f.groomer_id }))
        }
      />
    </Dialog>

  );
}

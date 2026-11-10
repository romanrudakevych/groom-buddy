import { FamilyContactsList } from "./FamilyContacts";
import { Link } from "react-router";
import { MessageCircle, MessageSquare, Pencil, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusTag, Tag } from "./ui";
import { czk, formatDate, fromISO, servicePriceForDog, type Appointment, type CrmData } from "@/lib/crm";
import { useI18n } from "@/lib/i18n";

export function AppointmentQuickView({ appointment, data, onClose, onEdit }: {
  appointment: Appointment | null;
  data: CrmData;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
}) {
  const { t, tr, dateLocale } = useI18n();
  if (!appointment) return null;

  const dog = data.dogs.find((d) => d.id === appointment.dog_id);
  const owners = data.clients.filter((c) => dog?.clientIds.includes(c.id));
  const groomer = data.groomers.find((g) => g.id === appointment.groomer_id);
  const salon = data.salons.find((s) => s.id === groomer?.salon_id);
  const services = data.services.filter((s) => appointment.serviceIds.includes(s.id));

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg sm:max-w-xl [&>button:last-child]:hidden">
        <DialogHeader className="pr-0 text-left">
          <DialogTitle className="tracking-normal">{t("visitDetails")}</DialogTitle>
          <DialogDescription>
            {fromISO(appointment.date).toLocaleDateString(dateLocale)} · {appointment.time} · {t("duration")}: {appointment.planned_duration} {t("minuteShort")}
          </DialogDescription>
          <div className="pt-1"><StatusTag status={appointment.status} /></div>
        </DialogHeader>

        <section className="space-y-2 border-t pt-3 text-sm" aria-label={t("dog")}>
          <h2 className="font-semibold">{t("dog")}</h2>
          {dog ? (
            <>
              <Link to={`/psi/${dog.id}`} onClick={onClose} className="break-words text-base font-semibold underline underline-offset-4">{dog.name}</Link>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                {dog.breed && <span>{t("breed")}: {dog.breed}</span>}
                <span>{t("size")}: {tr(dog.size)}</span>
                {dog.weight != null && <span>{t("weight")}: {dog.weight} {t("kg")}</span>}
                {dog.height != null && <span>{t("height")}: {dog.height} {t("cm")}</span>}
              </div>
              {dog.grooming_instructions && <p className="whitespace-pre-wrap break-words"><span className="text-muted-foreground">{t("groomingInstructions")}: </span>{dog.grooming_instructions}</p>}
              {dog.behavior && <p><span className="text-muted-foreground">{t("behavior")}: </span>{tr(dog.behavior)}</p>}
              {dog.notes && <p className="whitespace-pre-wrap break-words"><span className="text-muted-foreground">{t("dogNotes")}: </span>{dog.notes}</p>}
              {appointment.behavior_during_visit && <p><span className="text-muted-foreground">{t("behaviorDuringVisit")}: </span>{tr(appointment.behavior_during_visit)}</p>}
              {(() => {
                const past = data.appointments
                  .filter((a) => a.dog_id === dog.id && a.id !== appointment.id && a.status === "Dokončeno" && a.haircut_notes)
                  .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
                  .slice(0, 3);
                return past.length ? (
                  <div className="space-y-1 pt-1">
                    <div className="text-muted-foreground">{t("haircutHistory")}:</div>
                    {past.map((a) => (
                      <p key={a.id} className="whitespace-pre-wrap break-words">
                        <span className="text-muted-foreground">{formatDate(a.date)} · {data.groomers.find((g) => g.id === a.groomer_id)?.name ?? "—"}: </span>
                        {a.haircut_notes}
                      </p>
                    ))}
                  </div>
                ) : null;
              })()}
            </>
          ) : <p className="text-muted-foreground">{t("dogNotFound")}</p>}
        </section>

        <section className="space-y-3 border-t pt-3 text-sm" aria-label={t("owners")}>
          <h2 className="font-semibold">{t("mainOwner")}</h2>
          {owners.length === 0 && <p className="text-muted-foreground">{t("noData")}</p>}
          {owners.map((client) => {
            const digits = client.phone?.replace(/\D/g, "") ?? "";
            return (
              <div key={client.id} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
                <Link to={`/klienti/${client.id}`} onClick={onClose} className="break-words font-medium underline underline-offset-4">{client.name}</Link>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  {client.phone && <span>{t("phone")}: {client.phone}</span>}
                  {client.instagram && <a href={`https://instagram.com/${client.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="break-all underline">{tr("Instagram")}: {client.instagram}</a>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  <span>{t("communicationLanguage")}: {tr(client.language)} ({client.language})</span>
                  <span>{t("preferredContact")}: {tr(client.preferred_contact)}</span>
                </div>
                {client.phone && digits.length >= 5 && (
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="whatsapp"><a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer"><MessageCircle />{t("whatsapp")}</a></Button>
                    <Button asChild size="sm" variant="outline"><a href={`tel:${client.phone}`}><Phone />{t("call")}</a></Button>
                    <Button asChild size="sm" variant="outline"><a href={`sms:${client.phone}`}><MessageSquare />{t("sms")}</a></Button>
                  </div>
                )}
                <FamilyContactsList contacts={client.additional_contacts ?? []} />
              </div>
            );
          })}
        </section>

        <section className="space-y-2 border-t pt-3 text-sm" aria-label={t("services")}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">{t("groomer")}</dt><dd className="break-words">{groomer?.name ?? "—"}</dd>
            <dt className="text-muted-foreground">{t("salon")}</dt><dd>{salon?.name ?? "—"}</dd>
          </dl>
          <h2 className="pt-1 font-semibold">{t("servicesAtListPrice")}</h2>
          {services.map((service) => <div key={service.id} className="flex items-start justify-between gap-3"><span className="min-w-0 break-words">{tr(service.name)}</span><span className="shrink-0 tabular-nums">{czk(servicePriceForDog(service, dog))}</span></div>)}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
            <span className="font-semibold">{t("amount")}: {czk(appointment.price)}</span>
            {appointment.status === "Dokončeno" && <Tag>{appointment.paid_by_card ? t("paidByCardBadge") : t("cashRevenue")}</Tag>}
          </div>
          {appointment.notes && <p className="whitespace-pre-wrap break-words pt-1"><span className="text-muted-foreground">{t("visitNotes")}: </span>{appointment.notes}</p>}
        </section>

        <DialogFooter className="gap-2 border-t pt-3 sm:space-x-0">
          <Button variant="outline" onClick={onClose}>{t("close")}</Button>
          <Button onClick={() => onEdit(appointment)}><Pencil />{t("edit")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
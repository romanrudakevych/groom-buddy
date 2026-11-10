import { FamilyContactsList } from "@/components/crm/FamilyContacts";
import { useAuth } from "@/lib/auth";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionTitle, StatusTag } from "@/components/crm/ui";
import { DogAvatar, DogBadges, DogPhotoCard, KV, OpenOriginalButton } from "@/components/crm/DogBadges";
import { useDialogs } from "@/components/crm/DialogProvider";
import { czk, dogOwners, formatDate, lastGrooming, todayISO, useCrm } from "@/lib/crm";
import { translatedServiceNames, useI18n } from "@/lib/i18n";


export function DogDetail() {
  const { dogId } = useParams() as { dogId: string };
  const { data } = useCrm();
  const { t, tr } = useI18n();
  const { openDog, openAppointment } = useDialogs();
  const { can } = useAuth();

  const dog = data.dogs.find((d) => d.id === dogId);
  if (!dog) return <p className="text-sm text-muted-foreground">{t("dogNotFound")}</p>;

  const last = lastGrooming(data, dog.id);
  const owners = dogOwners(data, dog.id);
  const appts = data.appointments.filter((a) => a.dog_id === dog.id);
  const today = todayISO();
  const upcoming = appts
    .filter((a) => (a.status === "Naplánováno" || a.status === "Potvrzeno") && a.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const history = appts
    .filter((a) => !((a.status === "Naplánováno" || a.status === "Potvrzeno") && a.date >= today))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <DogAvatar dog={dog} size={96} />
            {dog.photo_path ? <OpenOriginalButton path={dog.photo_path} label={t("openOriginal")} /> : null}
          </div>
          <div>
          <h1 className="text-2xl font-semibold">{dog.name}</h1>
          <div className="text-sm text-muted-foreground">{dog.breed ?? "—"}</div>
          <div className="mt-2">
            <DogBadges dog={dog} full linkGroomer />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">{t("healthStatus")}: </span>
              {dog.is_healthy ?? true ? t("isHealthy") : `${t("notHealthy")}${dog.health_status ? ` — ${dog.health_status}` : ""}`}
            </div>
            <div>
              <span className="text-muted-foreground">{t("brushesTeeth")}: </span>
              {dog.brushes_teeth
                ? `${t("yes")}${dog.toothbrush_number ? ` · ${t("toothbrushNumber")}: ${dog.toothbrush_number}` : ""}`
                : t("no")}
            </div>
            {dog.notes ? (
              <div className="sm:col-span-2">
                <KV k={t("note")} v={<span className="whitespace-pre-wrap">{dog.notes}</span>} />
              </div>
            ) : null}
            {(dog.extra_notes ?? []).map((n, i) => (
              <div key={i} className="sm:col-span-2">
                <KV k={t("note")} v={<span className="whitespace-pre-wrap">{n}</span>} />
              </div>
            ))}
          </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openDog(dog)}>
            {t("edit")}
          </Button>
          {can("appointments_create") && (<Button onClick={() => openAppointment(null, { dog_id: dog.id })}>{t("recordVisit")}</Button>)}
        </div>
      </div>

      <DogPhotoCard dog={dog} />

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">✂️ {t("groomingInstructions")}</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">
            {dog.grooming_instructions || "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🕘 {t("lastGrooming")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {last ? (
              <>
                <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                  <KV k={t("date")} v={formatDate(last.date)} />
                  <KV k={t("groomer")} v={data.groomers.find((g) => g.id === last.groomer_id)?.name ?? "—"} />
                  <KV k={t("services")} v={translatedServiceNames(data, last.serviceIds, tr) || "—"} />
                </div>
                {last.notes ? <p className="whitespace-pre-wrap">{last.notes}</p> : null}
              </>
            ) : (
              <span className="text-muted-foreground">{t("noLastGrooming")}</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <SectionTitle>{t("mainOwner")}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {owners.map((o) => (
            <Link key={o.id} to={`/klienti/${o.id}`}>
              <Card className="hover:bg-accent">
                <CardHeader>
                  <CardTitle className="text-base">{o.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {o.phone ?? "—"}
                </CardContent>
              </Card>
            </Link>
          ))}
          {owners.map((o) => (
            <div key={`fc-${o.id}`} className="sm:col-span-2 lg:col-span-3">
              <FamilyContactsList contacts={o.additional_contacts ?? []} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>{t("upcomingBookings")}</SectionTitle>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noUpcomingBookings")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("time")}</TableHead>
                <TableHead>{t("groomer")}</TableHead>
                <TableHead>{t("services")}</TableHead>
                <TableHead>{t("price")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => openAppointment(a)}>
                  <TableCell>{formatDate(a.date)}</TableCell>
                  <TableCell>{a.time}</TableCell>
                  <TableCell>{data.groomers.find((g) => g.id === a.groomer_id)?.name}</TableCell>
                  <TableCell>{translatedServiceNames(data, a.serviceIds, tr)}</TableCell>
                  <TableCell>{czk(a.price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <SectionTitle>{t("visitHistory")}</SectionTitle>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("groomer")}</TableHead>
              <TableHead>{t("services")}</TableHead>
              <TableHead>{t("price")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("haircutNotes")}</TableHead>
              <TableHead>{t("actualBehavior")}</TableHead>
              <TableHead>{t("actualDuration")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((a) => (
              <TableRow key={a.id} className="cursor-pointer" onClick={() => openAppointment(a)}>
                <TableCell>{formatDate(a.date)}</TableCell>
                <TableCell>{data.groomers.find((g) => g.id === a.groomer_id)?.name}</TableCell>
                <TableCell>{translatedServiceNames(data, a.serviceIds, tr)}</TableCell>
                <TableCell>{czk(a.price)}</TableCell>
                <TableCell>
                  <StatusTag status={a.status} />
                </TableCell>
                <TableCell className="max-w-xs whitespace-pre-wrap">{a.haircut_notes || "—"}</TableCell>
                <TableCell>{a.behavior_during_visit ? tr(a.behavior_during_visit) : "—"}</TableCell>
                <TableCell>
                  {a.actual_duration ? `${a.actual_duration} ${t("minuteShort")}` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

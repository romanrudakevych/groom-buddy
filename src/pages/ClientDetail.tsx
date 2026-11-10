import { FamilyContactsList } from "@/components/crm/FamilyContacts";
import { Link, useParams } from "react-router";
import { Checkbox } from "@/components/ui/checkbox";
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
import { SectionTitle, StatusTag, Tag } from "@/components/crm/ui";
import { DogAvatar, DogBadges } from "@/components/crm/DogBadges";
import { useDialogs } from "@/components/crm/DialogProvider";
import { clientDogs, czk, formatDate, todayISO, useCrm, useCrmMutation } from "@/lib/crm";
import { supabase } from "@/integrations/supabase/client";
import { translatedServiceNames, useI18n } from "@/lib/i18n";


export function ClientDetail() {
  const { clientId } = useParams() as { clientId: string };
  const { data } = useCrm();
  const { t, tr } = useI18n();
  const { openClient, openAppointment } = useDialogs();

  const reviewMutation = useCrmMutation(async (reviewTaken: boolean) => {
    const { error } = await supabase
      .from("clients")
      .update({ review_taken: reviewTaken })
      .eq("id", clientId);
    if (error) throw error;
  });

  const client = data.clients.find((c) => c.id === clientId);
  if (!client) return <p className="text-sm text-muted-foreground">{t("clientNotFound")}</p>;

  const dogs = clientDogs(data, client.id);
  const dogIds = dogs.map((d) => d.id);
  const appts = data.appointments.filter((a) => dogIds.includes(a.dog_id));
  const today = todayISO();
  const upcoming = appts
    .filter((a) => (a.status === "Naplánováno" || a.status === "Potvrzeno") && a.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const history = appts
    .filter((a) => !((a.status === "Naplánováno" || a.status === "Potvrzeno") && a.date >= today))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const salon = data.salons.find((s) => s.id === client.preferred_salon_id)?.name;



  const Row = ({ a }: { a: (typeof appts)[number] }) => (
    <TableRow className="cursor-pointer" onClick={() => openAppointment(a)}>
      <TableCell>{formatDate(a.date)}</TableCell>
      <TableCell>{a.time}</TableCell>
      <TableCell>{data.dogs.find((d) => d.id === a.dog_id)?.name}</TableCell>
      <TableCell>{translatedServiceNames(data, a.serviceIds, tr)}</TableCell>
      <TableCell>{czk(a.price)}</TableCell>
      <TableCell>
        <StatusTag status={a.status} />
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            {client.phone ?? "—"} · {client.email ?? "—"}
          </div>
          {client.instagram ? (
            <a
              className="text-sm underline"
              href={`https://instagram.com/${client.instagram.replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
            >
              {client.instagram}
            </a>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Tag>{tr(client.language)}</Tag>
            <Tag>{tr(client.preferred_contact)}</Tag>
            {salon ? <Tag>{salon}</Tag> : null}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={client.review_taken}
                onCheckedChange={(v) => reviewMutation.mutate(v === true)}
              />
              {t("reviewTaken")}
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {client.phone && client.phone.replace(/\D/g, "").length >= 5 ? (
            <>
              <Button asChild variant="outline">
                <a
                  href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("whatsapp")}
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={`tel:${client.phone}`}>{t("call")}</a>
              </Button>
              <Button asChild variant="outline">
                <a href={`sms:${client.phone}`}>SMS</a>
              </Button>
            </>
          ) : null}
          {client.email ? (
            <Button asChild variant="outline">
              <a href={`mailto:${client.email}`}>Email</a>
            </Button>
          ) : null}
          <Button onClick={() => openClient(client)}>{t("edit")}</Button>
        </div>
      </div>

      {client.notes ? <p className="text-sm">{client.notes}</p> : null}
      <FamilyContactsList contacts={client.additional_contacts ?? []} />

      <div>
        <SectionTitle>{t("dogPlural")}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dogs.map((d) => (
            <Link key={d.id} to={`/psi/${d.id}`}>
              <Card className="hover:bg-accent">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <DogAvatar dog={d} size={44} />
                  <div>
                    <CardTitle className="text-base">{d.name}</CardTitle>
                    <div className="text-sm text-muted-foreground">{d.breed ?? "—"}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DogBadges dog={d} />
                </CardContent>
              </Card>
            </Link>
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
                <TableHead>{t("dog")}</TableHead>
                <TableHead>{t("services")}</TableHead>
                <TableHead>{t("price")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.map((a) => (
                <Row key={a.id} a={a} />
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
              <TableHead>{t("time")}</TableHead>
              <TableHead>{t("dog")}</TableHead>
              <TableHead>{t("services")}</TableHead>
              <TableHead>{t("price")}</TableHead>
              <TableHead>{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

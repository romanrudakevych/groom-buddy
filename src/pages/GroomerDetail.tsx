import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Kpi, SectionTitle, StatusTag, Tag } from "@/components/crm/ui";
import { useDialogs } from "@/components/crm/DialogProvider";
import { czk, deleteGroomer, formatDate, groomerRetention, todayISO, useCrm, useCrmMutation } from "@/lib/crm";
import { translatedServiceNames, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { canSeeGroomerFinances } from "@/lib/groomer-finances";


export function GroomerDetail() {
  const { groomerId } = useParams() as { groomerId: string };
  const { data } = useCrm();
  const { t, tr } = useI18n();
  const { openAppointment, openGroomer } = useDialogs();
  const navigate = useNavigate();
  const del = useCrmMutation((id: string) => deleteGroomer(id));
  const { role, groomerId: myGroomerId, can } = useAuth();
  const isGroomer = role === "groomer";
  const money = canSeeGroomerFinances(role, myGroomerId, groomerId, can("groomer_finances"));

  const groomer = data.groomers.find((g) => g.id === groomerId);
  if (!groomer || (isGroomer && groomer.id !== myGroomerId)) return <p className="text-sm text-muted-foreground">{t("groomerNotFound")}</p>;

  const appts = data.appointments.filter((a) => a.groomer_id === groomer.id);
  const done = appts.filter((a) => a.status === "Dokončeno");
  const noShow = appts.filter((a) => a.status === "Nedostavil se");
  const revenue = done.reduce((s, a) => s + a.price, 0);
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
      <div>
        <h1 className="text-2xl font-semibold">{groomer.name}</h1>
        <div className="text-sm text-muted-foreground">{groomer.phone ?? "—"}</div>
        <div className="mt-2 flex flex-wrap gap-1">
          <Tag>{data.salons.find((s) => s.id === groomer.salon_id)?.name}</Tag>
        </div>
      </div>
        {!isGroomer && <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => openGroomer(groomer)}>
          {t("edit")}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">{t("deleteGroomer")}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("deleteGroomer")}: {groomer.name}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteGroomerConfirm")} ({appts.length}).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  del.mutate(groomer.id, { onSuccess: () => navigate("/groomeri") })
                }
              >
                {t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label={t("completedVisits")} value={done.length} />
        {money && <><Kpi label={t("totalRevenue")} value={czk(revenue)} />
        <Kpi
          label={t("noShowRate")}
          value={`${appts.length ? Math.round((noShow.length / appts.length) * 100) : 0} %`}
        />
        <Kpi label={t("returnRate")} value={`${groomerRetention(data.appointments, groomer.id)} %`} /></>}
      </div>

      <div>
        <SectionTitle>{t("upcomingVisits")}</SectionTitle>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noUpcomingVisits")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("time")}</TableHead>
                <TableHead>{t("dog")}</TableHead>
                <TableHead>{t("services")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => openAppointment(a)}>
                  <TableCell>{formatDate(a.date)}</TableCell>
                  <TableCell>{a.time}</TableCell>
                  <TableCell>{data.dogs.find((d) => d.id === a.dog_id)?.name}</TableCell>
                  <TableCell>{translatedServiceNames(data, a.serviceIds, tr)}</TableCell>
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
              <TableHead>{t("dog")}</TableHead>
              <TableHead>{t("services")}</TableHead>
              {money && <TableHead>{t("price")}</TableHead>}
              <TableHead>{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((a) => (
              <TableRow key={a.id} className="cursor-pointer" onClick={() => openAppointment(a)}>
                <TableCell>{formatDate(a.date)}</TableCell>
                <TableCell>{data.dogs.find((d) => d.id === a.dog_id)?.name}</TableCell>
                <TableCell>{translatedServiceNames(data, a.serviceIds, tr)}</TableCell>
                {money && <TableCell>{czk(a.price)}</TableCell>}
                <TableCell>
                  <StatusTag status={a.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {money && <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>{t("revenueFromCompletedVisits")}</TableCell>
              <TableCell colSpan={2} className="font-medium">
                {czk(revenue)}
              </TableCell>
            </TableRow>
          </TableFooter>}
        </Table>
      </div>
    </div>
  );
}

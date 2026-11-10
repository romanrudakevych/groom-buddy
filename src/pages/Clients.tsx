import { Link, useSearchParams } from "react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pick } from "@/components/crm/Pick";
import { Field } from "@/components/crm/ui";
import { useDialogs } from "@/components/crm/DialogProvider";
import { clientDogs, dogOwners, formatDate, useCrm } from "@/lib/crm";
import { useI18n } from "@/lib/i18n";
import { ReactivationList } from "@/components/crm/Reactivation";


export function ClientBase() {
  const { data } = useCrm();
  const tab = useSearchParams()[0].get("tab") ?? undefined;
  const { t, tr } = useI18n();
  const { openClient, openDog } = useDialogs();
  const [search, setSearch] = useState("");
  const [salon, setSalon] = useState("");
  const [since, setSince] = useState("");
  const [sort, setSort] = useState("az");

  const q = search.trim().toLowerCase();

  const lastVisit = (clientId: string) => {
    const dogIds = clientDogs(data, clientId).map((d) => d.id);
    const dates = data.appointments
      .filter((a) => dogIds.includes(a.dog_id) && a.status === "Dokončeno")
      .map((a) => a.date)
      .sort();
    return dates.length ? dates[dates.length - 1]! : null;
  };

  const matches = (clientName: string, phone: string | null, dogNames: string[], extra: string[] = []) =>
    !q ||
    clientName.toLowerCase().includes(q) ||
    (phone ?? "").toLowerCase().includes(q) ||
    extra.some((x) => x.toLowerCase().includes(q)) ||
    dogNames.some((n) => n.toLowerCase().includes(q));

  const clients = data.clients
    .filter((c) => {
      const dogs = clientDogs(data, c.id);
      if (!matches(c.name, c.phone, dogs.map((d) => d.name), (c.additional_contacts ?? []).flatMap((x) => [x.name, x.phone]))) return false;
      if (salon && c.preferred_salon_id !== salon) return false;
      if (since) {
        const lv = lastVisit(c.id);
        if (!lv || lv < since) return false;
      }
      return true;
    })
    .sort((a, b) => (sort === "az" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));

  const dogs = data.dogs.filter((d) => {
    const owners = dogOwners(data, d.id);
    return (
      !q ||
      d.name.toLowerCase().includes(q) ||
      (d.breed ?? "").toLowerCase().includes(q) ||
      owners.some(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.phone ?? "").toLowerCase().includes(q) ||
          (o.additional_contacts ?? []).some(
            (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q),
          ),
      )
    );
  });

  const salonName = (id: string | null) => data.salons.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("clientBase")}</h1>

      <div className="max-w-md">
        <Field label={t("searchClientsDogs")}>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} />
        </Field>
      </div>

      <Tabs defaultValue={tab ?? "psi"}>
        <TabsList>
          <TabsTrigger value="psi">{t("dogs")}</TabsTrigger>
          <TabsTrigger value="klienti">{t("clients")}</TabsTrigger>
          <TabsTrigger value="attention">{t("reactivation")}</TabsTrigger>
        </TabsList>

        <TabsContent value="attention">
          <ReactivationList />
        </TabsContent>

        <TabsContent value="klienti" className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <Field label={t("salon")}>
                <Pick
                  value={salon}
                  onChange={setSalon}
                  options={data.salons.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder={t("allSalons")}
                />
              </Field>
            </div>
            <div className="w-44">
              <Field label={t("lastVisitFrom")}>
                <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} />
              </Field>
            </div>
            <div className="w-40">
              <Field label={t("sorting")}>
                <Pick
                  value={sort}
                  onChange={setSort}
                  options={[
                    { value: "az", label: t("nameAz") },
                    { value: "za", label: t("nameZa") },
                  ]}
                />
              </Field>
            </div>
            <Button onClick={() => openClient(null)}>{t("newClient")}</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("dogPlural")}</TableHead>
                <TableHead>{t("salon")}</TableHead>
                <TableHead>{t("lastVisit")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => {
                const lv = lastVisit(c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        to={`/klienti/${c.id}`}
                        className="font-medium underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>
                      {clientDogs(data, c.id)
                        .map((d) => d.name)
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell>{salonName(c.preferred_salon_id)}</TableCell>
                    <TableCell>{lv ? formatDate(lv) : "—"}</TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/klienti/${c.id}`}>
                          {t("show")}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="psi" className="space-y-3">
          <Button onClick={() => openDog(null)}>{t("newDog")}</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("breed")}</TableHead>
                <TableHead>{t("owners")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {dogs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link
                      to={`/psi/${d.id}`}
                      className="font-medium underline"
                    >
                      {d.name}
                    </Link>
                  </TableCell>
                  <TableCell>{d.breed ?? "—"}</TableCell>
                  <TableCell>
                    {dogOwners(data, d.id)
                      .map((o) => o.name)
                      .join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/psi/${d.id}`}>
                        {t("show")}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Link } from "react-router";
import { useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pick } from "@/components/crm/Pick";
import { Field } from "@/components/crm/ui";
import {
  ABSENCE_REASONS,
  CONTACT_RESULTS,
  dogOwners,
  formatDate,
  inactiveDogs,
  saveReactivationContact,
  todayISO,
  useCrm,
  useCrmMutation,
  type Dog,
} from "@/lib/crm";
import { localizedOptions, useI18n } from "@/lib/i18n";

export function ReactivationList() {
  const { data } = useCrm();
  const { t, tr } = useI18n();
  const [threshold, setThreshold] = useState("60");
  const [contactDog, setContactDog] = useState<Dog | null>(null);
  const rows = inactiveDogs(data, Number(threshold), todayISO());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Field label={t("absentLongerThan")}>
            <Pick
              value={threshold}
              onChange={setThreshold}
              options={[
                { value: "60", label: t("days60") },
                { value: "90", label: t("days90") },
                { value: "120", label: t("days120") },
              ]}
            />
          </Field>
        </div>
        <p className="pb-2 text-sm text-muted-foreground">
          {t("reactivationHint")} · {rows.length}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noInactiveDogs")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("dog")}</TableHead>
              <TableHead>{t("owners")}</TableHead>
              <TableHead>{t("lastVisit")}</TableHead>
              <TableHead>{t("lastContact")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ dog, lastVisit, days, lastContact }) => {
              const owners = dogOwners(data, dog.id);
              return (
                <TableRow key={dog.id}>
                  <TableCell>
                    <Link to={`/psi/${dog.id}`} className="font-medium underline">
                      {dog.name}
                    </Link>
                  </TableCell>
                  <TableCell className="space-y-1">
                    {owners.map((o) => {
                      const digits = (o.phone ?? "").replace(/\D/g, "");
                      return (
                        <div key={o.id} className="flex flex-wrap items-center gap-2">
                          <Link to={`/klienti/${o.id}`} className="underline">
                            {o.name}
                          </Link>
                          {digits ? (
                            <>
                              <Button asChild size="sm" variant="whatsapp">
                                <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
                                  <MessageCircle />
                                </a>
                              </Button>
                              <Button asChild size="sm" variant="outline">
                                <a href={`tel:${o.phone}`}>
                                  <Phone />
                                </a>
                              </Button>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </TableCell>
                  <TableCell>
                    {formatDate(lastVisit)}
                    <span className="ml-2 rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      {days} {t("daysAgo")}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {lastContact
                      ? `${formatDate(lastContact.contacted_at)} · ${tr(lastContact.result)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setContactDog(dog)}>
                      {t("logContact")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <ContactDialog dog={contactDog} onClose={() => setContactDog(null)} />
    </div>
  );
}

function ContactDialog({ dog, onClose }: { dog: Dog | null; onClose: () => void }) {
  const { t, tr } = useI18n();
  const [result, setResult] = useState<string>("Kontaktován");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [remind, setRemind] = useState("");
  const mutation = useCrmMutation(saveReactivationContact);

  const close = () => {
    setResult("Kontaktován");
    setReason("");
    setNote("");
    setRemind("");
    onClose();
  };

  const save = () => {
    if (!dog) return;
    mutation.mutate(
      { dog_id: dog.id, result, reason: reason || null, note: note.trim() || null, remind_on: remind || null },
      {
        onSuccess: () => {
          toast.success(t("contactSaved"));
          close();
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  return (
    <Dialog open={!!dog} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("logContact")} — {dog?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label={t("contactResult")}>
            <Pick value={result} onChange={setResult} options={localizedOptions(CONTACT_RESULTS, tr)} />
          </Field>
          <Field label={t("absenceReason")}>
            <Pick value={reason} onChange={setReason} options={localizedOptions(ABSENCE_REASONS, tr)} placeholder="—" />
          </Field>
          <Field label={t("remindOn")}>
            <Input type="date" value={remind} onChange={(e) => setRemind(e.target.value)} />
          </Field>
          <Field label={t("notes")}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {t("cancel")}
          </Button>
          <Button onClick={save} disabled={mutation.isPending}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

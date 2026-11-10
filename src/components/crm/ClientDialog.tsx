import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "./ui";
import {
  BEHAVIORS,
  COATS,
  CONTACTS,
  LANGUAGES,
  SIZES,
  saveClient,
  useCrm,
  useCrmMutation,
  type Client,
  type ClientInput,
  type DogInput,
  type FamilyContact,
} from "@/lib/crm";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

const emptyClient: ClientInput = {
  name: "",
  phone: "",
  email: "",
  instagram: "",
  language: "CZE",
  preferred_contact: "Phone",
  preferred_salon_id: null,
  review_taken: false,
  notes: "",
  additional_contacts: [],
};

const emptyDog: DogInput = {
  name: "",
  breed: "",
  size: "Střední",
  coat: "Krátká",
  behavior: "Klidný",
  age: null,
  sex: null,
  health_status: "",
  coat_status: "",
  notes: "",
  is_healthy: true,
  brushes_teeth: false,
  toothbrush_number: "",
  extra_notes: [],
  photo_url: null,
  photo_path: null,
  height: null,
  weight: null,
  pinned_groomer_id: null,
  grooming_instructions: "",
  preferred_additional_services: [],
};

export function ClientDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client?: Client | null;
}) {
  const { t, tr } = useI18n();
  const { data } = useCrm();
  const [form, setForm] = useState<ClientInput>(emptyClient);
  const [dogIds, setDogIds] = useState<string[]>([]);
  const [newDog, setNewDog] = useState<DogInput>(emptyDog);
  const [showDogForm, setShowDogForm] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (client) {
      setForm({
        id: client.id,
        name: client.name,
        phone: client.phone ?? "",
        email: client.email ?? "",
        instagram: client.instagram ?? "",
        language: client.language,
        preferred_contact: client.preferred_contact,
        preferred_salon_id: client.preferred_salon_id,
        review_taken: client.review_taken,
        notes: client.notes ?? "",
        additional_contacts: client.additional_contacts ?? [],
      });
      setDogIds(client.dogIds);
    } else {
      setForm(emptyClient);
      setDogIds([]);
    }
    setNewDog(emptyDog);
    setShowDogForm(false);
  }, [open, client]);

  const mutation = useCrmMutation(async () =>
    saveClient(form, dogIds, newDog.name.trim() ? newDog : undefined),
  );

  const canSave = form.name.trim().length > 0;

  const submit = () => {
    mutation.mutate(undefined as never, {
      onSuccess: () => {
        toast.success(client ? t("clientUpdated") : t("clientCreated"));
        onOpenChange(false);
      },
      onError: (e: unknown) => toast.error(`${t("saveFailed")}: ${String(e)}`),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{client ? t("editClient") : t("newClient")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("name")} required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t("phone")}>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label={t("email")}>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Instagram">
            <Input
              placeholder="@jmeno"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            />
          </Field>
          <Field label={t("language")}>
            <Pick
              value={form.language}
              onChange={(v) => setForm({ ...form, language: v })}
              options={opts(LANGUAGES, tr)}
            />
          </Field>
          <Field label={t("preferredContact")}>
            <Pick
              value={form.preferred_contact}
              onChange={(v) => setForm({ ...form, preferred_contact: v })}
              options={opts(CONTACTS, tr)}
            />
          </Field>
          <Field label={t("preferredSalon")}>
            <Pick
              value={form.preferred_salon_id ?? ""}
              onChange={(v) => setForm({ ...form, preferred_salon_id: v || null })}
              options={data.salons.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="—"
            />
          </Field>
          <label className="flex items-center gap-2 pt-2 text-sm">
            <Checkbox
              checked={form.review_taken}
              onCheckedChange={(v) => setForm({ ...form, review_taken: v === true })}
            />
            {t("reviewTaken")}
          </label>
          <div className="sm:col-span-2">
            <Field label={t("notes")}>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <div className="mt-2 rounded border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-medium">{t("familyContacts")}</h3>
            <Button
              size="sm"
              variant="outline"
              disabled={form.additional_contacts.length >= 3}
              onClick={() =>
                setForm({
                  ...form,
                  additional_contacts: [
                    ...form.additional_contacts,
                    { id: crypto.randomUUID(), name: "", role: "", phone: "" },
                  ],
                })
              }
            >
              <Plus /> {t("addContact")}
            </Button>
          </div>
          {form.additional_contacts.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("noFamilyContacts")}</p>
          )}
          <div className="space-y-2">
            {form.additional_contacts.map((c, i) => {
              const upd = (patch: Partial<FamilyContact>) =>
                setForm({
                  ...form,
                  additional_contacts: form.additional_contacts.map((x) =>
                    x.id === c.id ? { ...x, ...patch } : x,
                  ),
                });
              return (
                <div key={c.id} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <Field label={`${i + 2}. ${t("name")}`}>
                    <Input value={c.name} onChange={(e) => upd({ name: e.target.value })} />
                  </Field>
                  <Field label={t("contactRole")}>
                    <Input
                      placeholder={t("contactRolePlaceholder")}
                      value={c.role}
                      onChange={(e) => upd({ role: e.target.value })}
                    />
                  </Field>
                  <Field label={t("phone")}>
                    <Input value={c.phone} onChange={(e) => upd({ phone: e.target.value })} />
                  </Field>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t("delete")}
                    onClick={() =>
                      setForm({
                        ...form,
                        additional_contacts: form.additional_contacts.filter((x) => x.id !== c.id),
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-2 rounded border p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{t("dogsSection")}</h3>
            {showDogForm ? (
              <Button
                size="sm"
                variant="ghost"
                aria-label={t("delete")}
                onClick={() => {
                  setNewDog(emptyDog);
                  setShowDogForm(false);
                }}
              >
                <Trash2 /> {t("delete")}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowDogForm(true)}>
                <Plus /> {t("addDog")}
              </Button>
            )}
          </div>

          {showDogForm ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("dogName")} required>
                <Input
                  value={newDog.name}
                  onChange={(e) => setNewDog({ ...newDog, name: e.target.value })}
                />
              </Field>
              <Field label={t("breed")}>
                <Input
                  value={newDog.breed}
                  onChange={(e) => setNewDog({ ...newDog, breed: e.target.value })}
                />
              </Field>
              <Field label={t("size")}>
                <Pick
                  value={newDog.size}
                  onChange={(v) => setNewDog({ ...newDog, size: v })}
                  options={opts(SIZES, tr)}
                />
              </Field>
              <Field label={t("coat")}>
                <Pick
                  value={newDog.coat}
                  onChange={(v) => setNewDog({ ...newDog, coat: v })}
                  options={opts(COATS, tr)}
                />
              </Field>
              <Field label={t("behavior")}>
                <Pick
                  value={newDog.behavior}
                  onChange={(v) => setNewDog({ ...newDog, behavior: v })}
                  options={opts(BEHAVIORS, tr)}
                />
              </Field>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("noDogsHint")}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button disabled={!canSave || mutation.isPending} onClick={submit}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

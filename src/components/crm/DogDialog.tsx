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
import { CheckList, Field, Toggle2 } from "./ui";
import { SearchPick } from "./SearchPick";
import {
  BEHAVIORS,
  COATS,
  SEXES,
  SIZES,
  additionalServices,
  fileToDataUrl,
  uploadDogPhoto,
  saveDog,
  useCrm,
  useCrmMutation,
  type ClientInput,
  type Dog,
  type DogInput,
} from "@/lib/crm";
import { toast } from "sonner";
import { DogAvatar } from "./DogBadges";
import { useI18n } from "@/lib/i18n";

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

export function DogDialog({
  open,
  onOpenChange,
  dog,
  initialName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dog?: Dog | null;
  initialName?: string;
  onCreated?: (dogId: string, pinnedGroomerId: string | null) => void;
}) {
  const { t, tr } = useI18n();
  const { data } = useCrm();
  const [form, setForm] = useState<DogInput>(emptyDog);
  const [mode, setMode] = useState<"a" | "b">("a");
  const [ownerId, setOwnerId] = useState<string>("");
  const [newClient, setNewClient] = useState<ClientInput>(emptyClient);

  useEffect(() => {
    if (!open) return;
    if (dog) {
      setForm({
        id: dog.id,
        name: dog.name,
        breed: dog.breed ?? "",
        size: dog.size,
        coat: dog.coat,
        behavior: dog.behavior,
        age: dog.age,
        sex: dog.sex,
        health_status: dog.health_status ?? "",
        coat_status: dog.coat_status ?? "",
        notes: dog.notes ?? "",
        is_healthy: dog.is_healthy ?? true,
        brushes_teeth: dog.brushes_teeth ?? false,
        toothbrush_number: dog.toothbrush_number ?? "",
        extra_notes: dog.extra_notes ?? [],
        photo_url: dog.photo_url,
        photo_path: dog.photo_path,
        height: dog.height,
        weight: dog.weight,
        pinned_groomer_id: dog.pinned_groomer_id,
        grooming_instructions: dog.grooming_instructions ?? "",
        preferred_additional_services: dog.preferred_additional_services ?? [],
      });
      setOwnerId(dog.owner_id ?? "");
    } else {
      setForm({ ...emptyDog, name: initialName ?? "" });
      setOwnerId("");
    }
    setMode("a");
    setPhotoFile(null);
    setNewClient(emptyClient);
  }, [open, dog, initialName]);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const mutation = useCrmMutation(async () => {
    const input = { ...form };
    if (photoFile) input.photo_path = await uploadDogPhoto(photoFile);
    return saveDog(input, mode === "a" ? ownerId || null : null, mode === "b" ? newClient : undefined);
  });

  const relationOk = mode === "a" ? !!ownerId : newClient.name.trim().length > 0;
  const canSave = form.name.trim().length > 0 && relationOk;

  const submit = () =>
    mutation.mutate(undefined as never, {
      onSuccess: (dogId) => {
        toast.success(dog ? t("dogUpdated") : t("dogCreated"));
        if (!dog && typeof dogId === "string") onCreated?.(dogId, form.pinned_groomer_id);
        onOpenChange(false);
      },
      onError: (e: unknown) => toast.error(`${t("saveFailed")}: ${String(e)}`),
    });


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dog ? t("editDog") : t("newDog")}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <DogAvatar dog={{ name: form.name, photo_url: form.photo_url }} size={72} />
          <label className="cursor-pointer rounded border px-3 py-1.5 text-sm hover:bg-accent">
            {t("uploadPhoto")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const url = await fileToDataUrl(f);
                  setForm((p) => ({ ...p, photo_url: url }));
                  setPhotoFile(f);
                } catch {
                  toast.error(t("saveFailed"));
                }
                e.target.value = "";
              }}
            />
          </label>
          {form.photo_url ? (
            <Button variant="ghost" size="sm" onClick={() => {
              setForm({ ...form, photo_url: null, photo_path: null });
              setPhotoFile(null);
            }}>
              {t("removePhoto")}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("name")} required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t("breed")}>
            <Input
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
            />
          </Field>
          <Field label={t("size")}>
            <Pick
              value={form.size}
              onChange={(v) => setForm({ ...form, size: v })}
              options={opts(SIZES, tr)}
            />
          </Field>
          <Field label={t("coat")}>
            <Pick
              value={form.coat}
              onChange={(v) => setForm({ ...form, coat: v })}
              options={opts(COATS, tr)}
            />
          </Field>
          <Field label={t("behavior")}>
            <Pick
              value={form.behavior}
              onChange={(v) => setForm({ ...form, behavior: v })}
              options={opts(BEHAVIORS, tr)}
            />
          </Field>
          <Field label={t("sex")}>
            <Pick
              value={form.sex ?? ""}
              onChange={(v) => setForm({ ...form, sex: v || null })}
              options={opts(SEXES, tr)}
              placeholder="—"
            />
          </Field>
          <Field label={t("ageYears")}>
            <Input
              type="number"
              min={0}
              value={form.age ?? ""}
              onChange={(e) =>
                setForm({ ...form, age: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>
          <Field label={t("heightCm")}>
            <Input
              type="number"
              min={0}
              step="1"
              value={form.height ?? ""}
              onChange={(e) =>
                setForm({ ...form, height: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>
          <Field label={t("weightKg")}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.weight ?? ""}
              onChange={(e) =>
                setForm({ ...form, weight: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("pinnedGroomer")}>
              <Pick
                value={form.pinned_groomer_id ?? ""}
                onChange={(v) => setForm({ ...form, pinned_groomer_id: v || null })}
                options={data.groomers.map((g) => ({
                  value: g.id,
                  label: `${g.name} – ${data.salons.find((s) => s.id === g.salon_id)?.name ?? ""}`,
                }))}
                placeholder="—"
              />
            </Field>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_healthy}
                onChange={(e) => setForm({ ...form, is_healthy: e.target.checked })}
              />
              {t("isHealthy")}
            </label>
            {!form.is_healthy ? (
              <Field label={t("healthNote")}>
                <Textarea
                  value={form.health_status}
                  onChange={(e) => setForm({ ...form, health_status: e.target.value })}
                />
              </Field>
            ) : null}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.brushes_teeth}
                onChange={(e) => setForm({ ...form, brushes_teeth: e.target.checked })}
              />
              {t("brushesTeeth")}
            </label>
            {form.brushes_teeth ? (
              <Field label={t("toothbrushNumber")}>
                <Input
                  value={form.toothbrush_number}
                  onChange={(e) => setForm({ ...form, toothbrush_number: e.target.value })}
                />
              </Field>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <Field label={t("groomingInstructions")}>
              <Textarea
                placeholder={t("groomingInstructionsPh")}
                value={form.grooming_instructions}
                onChange={(e) => setForm({ ...form, grooming_instructions: e.target.value })}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t("additionalServices")}>
              <CheckList
                items={additionalServices(data).map((s) => ({ id: s.id, label: tr(s.name) }))}
                selected={form.preferred_additional_services}
                onToggle={(id) =>
                  setForm((f) => ({
                    ...f,
                    preferred_additional_services: f.preferred_additional_services.includes(id)
                      ? f.preferred_additional_services.filter((x) => x !== id)
                      : [...f.preferred_additional_services, id],
                  }))
                }
              />
            </Field>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Field label={t("notes")}>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            {form.extra_notes.map((n, i) => (
              <div key={i} className="flex gap-2">
                <Textarea
                  value={n}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      extra_notes: f.extra_notes.map((x, j) => (j === i ? e.target.value : x)),
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({ ...f, extra_notes: f.extra_notes.filter((_, j) => j !== i) }))
                  }
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, extra_notes: [...f.extra_notes, ""] }))}
            >
              + {t("addNote")}
            </Button>
          </div>
        </div>

        <div className="mt-2 rounded border p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{t("mainOwnerRequired")}</h3>
            <Toggle2
              value={mode}
              onChange={setMode}
              a={t("linkExistingClients")}
              b={t("createNewClient")}
            />
          </div>

          {mode === "a" ? (
            <SearchPick
              value={ownerId}
              onChange={setOwnerId}
              options={data.clients.map((c) => ({
                value: c.id,
                label: `${c.name}${c.phone ? ` – ${c.phone}` : ""}`,
              }))}
              placeholder={t("mainOwner")}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("clientName")} required>
                <Input
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
              </Field>
              <Field label={t("phone")}>
                <Input
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                />
              </Field>
              <Field label={t("email")}>
                <Input
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                />
              </Field>
            </div>
          )}
          {!relationOk ? (
            <p className="mt-2 text-xs text-destructive">
              {t("dogNeedsOwner")}
            </p>
          ) : null}
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

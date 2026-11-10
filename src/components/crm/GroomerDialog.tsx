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
import { Pick } from "./Pick";
import { Field } from "./ui";
import {
  GROOMER_PALETTE,
  groomerColor,
  nextGroomerColor,
  saveGroomer,
  useCrm,
  useCrmMutation,
  type Groomer,
  type GroomerInput,
} from "@/lib/crm";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export function GroomerDialog({
  open,
  onOpenChange,
  groomer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groomer?: Groomer | null;
}) {
  const { t } = useI18n();
  const { data } = useCrm();
  const [form, setForm] = useState<GroomerInput>({
    name: "",
    phone: "",
    specialties: [],
    salon_id: "",
    color: GROOMER_PALETTE[0]!,
  });

  useEffect(() => {
    if (!open) return;
    if (groomer) {
      setForm({
        id: groomer.id,
        name: groomer.name,
        phone: groomer.phone ?? "",
        specialties: groomer.specialties,
        salon_id: groomer.salon_id,
        color: groomerColor(data.groomers, groomer.id),
      });
    } else {
      setForm({
        name: "",
        phone: "",
        specialties: [],
        salon_id: data.salons[0]?.id ?? "",
        color: nextGroomerColor(data.groomers),
      });
    }
  }, [open, groomer, data.salons, data.groomers]);

  const mutation = useCrmMutation(async () => saveGroomer(form));
  const canSave = form.name.trim().length > 0 && !!form.salon_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{groomer ? t("editGroomer") : t("newGroomer")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label={t("name")} required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t("phone")}>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label={t("salon")} required>
            <Pick
              value={form.salon_id}
              onChange={(v) => setForm({ ...form, salon_id: v })}
              options={data.salons.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
          <Field label={t("groomerColor")}>
            <div className="flex flex-wrap items-center gap-2">
              {GROOMER_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-7 w-7 rounded-full border-2 ${form.color === c ? "border-foreground ring-2 ring-ring ring-offset-2" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                aria-label={t("groomerColor")}
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-7 w-10 cursor-pointer rounded border bg-transparent"
              />
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            disabled={!canSave || mutation.isPending}
            onClick={() =>
              mutation.mutate(undefined as never, {
                onSuccess: () => {
                  toast.success(groomer ? t("groomerUpdated") : t("groomerCreated"));
                  onOpenChange(false);
                },
                onError: (e: unknown) => toast.error(`${t("saveFailed")}: ${String(e)}`),
              })
            }
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dogPhotoSignedUrl, formatDate, setDogPhoto, useCrmMutation, type CrmData, type Dog } from "@/lib/crm";
import { useI18n } from "@/lib/i18n";

/** Groomer-facing card: big photo, haircut instructions, quick photo upload. No prices or contacts. */
export function GroomerCardDialog({ dog, data, onClose }: { dog: Dog; data: CrmData; onClose: () => void }) {
  const { t, tr } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  const save = useCrmMutation((file: File) => setDogPhoto(dog.id, file));

  useEffect(() => {
    let alive = true;
    setFullUrl(null);
    if (dog.photo_path) {
      dogPhotoSignedUrl(dog.photo_path).then((u) => alive && setFullUrl(u)).catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [dog.photo_path]);

  const photo = fullUrl ?? dog.photo_url;
  const last = data.appointments
    .filter((a) => a.dog_id === dog.id && a.status === "Dokončeno" && a.haircut_notes)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0];
  const healthy = dog.is_healthy ?? true;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="text-left">
          <DialogTitle>
            {t("groomerCard")}: {dog.name}
          </DialogTitle>
          <DialogDescription>{dog.breed ?? "—"}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            {photo ? (
              <button type="button" onClick={() => setZoom(true)} className="block w-full">
                <img src={photo} alt={dog.name} className="max-h-[60dvh] w-full rounded-lg border object-contain" />
              </button>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
                <span className="text-5xl">🐶</span>
                {t("noPhotoYet")}
              </div>
            )}
            <Button
              variant={photo ? "outline" : "default"}
              className="w-full"
              disabled={save.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Camera />
              {save.isPending ? t("saving") : photo ? t("replacePhoto") : t("takeOrUploadPhoto")}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) save.mutate(f, { onError: (err) => toast.error((err as Error).message) });
                e.target.value = "";
              }}
            />
          </div>

          <div className="space-y-4 text-sm">
            <section>
              <h3 className="mb-1 font-semibold">✂️ {t("groomingInstructions")}</h3>
              <p className="whitespace-pre-wrap text-base">{dog.grooming_instructions || "—"}</p>
            </section>
            <section>
              <h3 className="mb-1 font-semibold">🕘 {t("lastHaircut")}</h3>
              {last ? (
                <p className="whitespace-pre-wrap">
                  <span className="text-muted-foreground">
                    {formatDate(last.date)} · {data.groomers.find((g) => g.id === last.groomer_id)?.name ?? "—"}:{" "}
                  </span>
                  {last.haircut_notes}
                </p>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </section>
            <section className="space-y-1">
              <h3 className="mb-1 font-semibold">⚠️ {t("specialNotes")}</h3>
              <p>
                <span className="text-muted-foreground">{t("behavior")}: </span>
                {tr(dog.behavior)}
              </p>
              <p>
                <span className="text-muted-foreground">{t("healthStatus")}: </span>
                {healthy ? t("isHealthy") : `${t("notHealthy")}${dog.health_status ? ` — ${dog.health_status}` : ""}`}
              </p>
              {dog.brushes_teeth ? (
                <p>
                  🪥 <span className="text-muted-foreground">{t("toothbrushNumber")}: </span>
                  {dog.toothbrush_number || "—"}
                </p>
              ) : null}
              {[dog.notes, ...(dog.extra_notes ?? [])].filter(Boolean).map((n, i) => (
                <p key={i} className="whitespace-pre-wrap">
                  <span className="text-muted-foreground">{t("note")}: </span>
                  {n}
                </p>
              ))}
            </section>
          </div>
        </div>

        {zoom && photo ? (
          <button
            type="button"
            onClick={() => setZoom(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4"
          >
            <img src={photo} alt={dog.name} className="max-h-full max-w-full object-contain" />
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

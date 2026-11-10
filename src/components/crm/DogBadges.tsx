import { Link } from "react-router";
import { useEffect, useRef, useState } from "react";
import { dogPhotoSignedUrl, setDogPhoto, useCrm, useCrmMutation, type Dog } from "@/lib/crm";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <span className="text-sm">
      <span className="text-muted-foreground">{k}: </span>
      <span className="font-medium">{v}</span>
    </span>
  );
}

export function DogAvatar({ dog, size = 64 }: { dog: Pick<Dog, "name" | "photo_url">; size?: number }) {
  return dog.photo_url ? (
    <img
      src={dog.photo_url}
      alt={dog.name}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full border object-cover"
    />
  ) : (
    <div
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      className="flex shrink-0 items-center justify-center rounded-full border bg-muted"
      aria-label={dog.name}
    >
      🐶
    </div>
  );
}

/** Opens the full-size private original in a new tab via a short-lived signed link. */
export function OpenOriginalButton({ path, label }: { path: string; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="text-xs underline"
      onClick={async () => {
        const w = window.open("", "_blank");
        setBusy(true);
        try {
          const url = await dogPhotoSignedUrl(path);
          if (w) w.location.href = url;
        } catch {
          w?.close();
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </button>
  );
}

export function DogBadges({ dog, full = false, linkGroomer = false }: { dog: Dog; full?: boolean; linkGroomer?: boolean }) {
  const { t, tr } = useI18n();
  const { data } = useCrm();
  const g = data.groomers.find((x) => x.id === dog.pinned_groomer_id);
  const extras = dog.preferred_additional_services
    .map((id) => data.services.find((s) => s.id === id)?.name)
    .filter(Boolean) as string[];
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
      <KV k={t("size")} v={tr(dog.size)} />
      <KV k={t("coat")} v={tr(dog.coat)} />
      <KV k={t("behavior")} v={tr(dog.behavior)} />
      {dog.weight != null ? <KV k={t("weight")} v={`${dog.weight} ${t("kg")}`} /> : null}
      {dog.height != null ? <KV k={t("height")} v={`${dog.height} ${t("cm")}`} /> : null}
      {full && dog.sex ? <KV k={t("sexLabel")} v={tr(dog.sex)} /> : null}
      {full && dog.age != null ? <KV k={t("ageLabel")} v={`${dog.age} ${t("years")}`} /> : null}
      {g ? (
        <KV
          k={t("pinnedGroomer")}
          v={
            linkGroomer ? (
              <Link to={`/groomeri/${g.id}`} className="underline">
                {g.name}
              </Link>
            ) : (
              g.name
            )
          }
        />
      ) : null}
      {extras.length ? <KV k={t("additionalServices")} v={extras.map(tr).join(", ")} /> : null}
    </div>
  );
}

/** Large photo preview on the dog card with a direct upload button. */
export function DogPhotoCard({ dog }: { dog: Dog }) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const save = useCrmMutation((file: File) => setDogPhoto(dog.id, file));

  useEffect(() => {
    let alive = true;
    if (dog.photo_path) {
      dogPhotoSignedUrl(dog.photo_path)
        .then((u) => {
          if (alive) setSignedUrl(u);
        })
        .catch(() => {});
    } else {
      setSignedUrl(null);
    }
    return () => {
      alive = false;
    };
  }, [dog.photo_path]);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">{t("dogPhoto")}</h3>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => inputRef.current?.click()}>
              {save.isPending ? t("saving") : t("uploadPhoto")}
            </Button>
            {dog.photo_path ? <OpenOriginalButton path={dog.photo_path} label={t("openOriginal")} /> : null}
          </div>
        </div>
        {signedUrl ? (
          <img
            src={signedUrl}
            alt={dog.name}
            className="mx-auto max-h-[420px] w-full rounded-lg border object-contain"
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-5xl">
            🐶
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void save.mutateAsync(f);
            e.target.value = "";
          }}
        />
      </CardContent>
    </Card>
  );
}

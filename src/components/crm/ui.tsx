import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md border bg-muted/40 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded px-3 py-1 text-sm transition-colors",
            value === o.value
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  Naplánováno: "bg-blue-100 text-blue-800 border-blue-200",
  Potvrzeno: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Dokončeno: "bg-green-100 text-green-800 border-green-200",
  Zrušeno: "bg-gray-100 text-gray-700 border-gray-200",
  "Nedostavil se": "bg-red-100 text-red-800 border-red-200",
};

export function StatusTag({ status }: { status: string }) {
  const { tr } = useI18n();
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs",
        statusStyles[status] ?? "bg-muted",
      )}
    >
      {tr(status)}
    </span>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export function BarList({
  items,
  formatValue,
}: {
  items: { label: string; value: number }[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const { t } = useI18n();
  if (!items.length) return <p className="text-sm text-muted-foreground">{t("noData")}</p>;
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex justify-between text-sm">
            <span>{i.label}</span>
            <span className="font-medium">{formatValue ? formatValue(i.value) : i.value}</span>
          </div>
          <div className="mt-1 h-2 w-full rounded bg-muted">
            <div
              className="h-2 rounded bg-primary"
              style={{ width: `${(i.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <Badge variant="secondary">{children}</Badge>;
}

export function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}

export function CheckList({
  items,
  selected,
  onToggle,
  empty,
}: {
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  empty?: string;
}) {
  const { t } = useI18n();
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty ?? t("noItems")}</p>;
  return (
    <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-2">
      {items.map((i) => (
        <label key={i.id} className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={selected.includes(i.id)} onCheckedChange={() => onToggle(i.id)} />
          <span>{i.label}</span>
        </label>
      ))}
    </div>
  );
}

export function Toggle2({
  value,
  onChange,
  a,
  b,
}: {
  value: "a" | "b";
  onChange: (v: "a" | "b") => void;
  a: string;
  b: string;
}) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant={value === "a" ? "default" : "outline"}
        onClick={() => onChange("a")}
      >
        {a}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "b" ? "default" : "outline"}
        onClick={() => onChange("b")}
      >
        {b}
      </Button>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-lg font-semibold">{children}</h2>;
}

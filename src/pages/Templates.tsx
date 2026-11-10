import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/crm";
import { Pick, opts } from "@/components/crm/Pick";
import { Field } from "@/components/crm/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";

export const TEMPLATE_TYPES = [
  "Připomínka zítřejší návštěvy",
  "Pes je připraven k vyzvednutí",
  "Potvrzení rezervace",
  "Následná péče / poděkování",
  "Nedostavil se",
] as const;

type Template = {
  id: string;
  language: string;
  type: string;
  title: string;
  body: string;
};


const KEY = ["message_templates"];

export function TemplatesPage() {
  const { t: text, tr } = useI18n();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("id, language, type, title, body")
        .order("type")
        .order("language");
      if (error) throw error;
      return data as Template[];
    },
  });
  const [lang, setLang] = useState("");
  const [type, setType] = useState("");
  const [editing, setEditing] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Template | null>(null);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("message_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(text("templateDeleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = data.filter(
    (template) => (!lang || template.language === lang) && (!type || template.type === type),
  );

  const copy = async (template: Template) => {
    try {
      await navigator.clipboard.writeText(template.body);
      toast.success(text("textCopied"));
    } catch {
      toast.error(text("copyFailed"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{text("templates")}</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          {text("newTemplate")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Pick
          className="w-40"
          value={lang}
          onChange={setLang}
          options={opts(LANGUAGES, tr)}
          placeholder={text("allLanguages")}
        />
        <Pick
          className="w-72"
          value={type}
          onChange={setType}
          options={opts(TEMPLATE_TYPES, tr)}
          placeholder={text("allTypes")}
        />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{text("loading")}</p>
      ) : !list.length ? (
        <p className="text-sm text-muted-foreground">{text("noTemplates")}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{template.title}</CardTitle>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{tr(template.language)}</Badge>
                  <Badge variant="outline">{tr(template.type)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap text-sm">{template.body}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => copy(template)}>
                    {text("copyText")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(template);
                      setOpen(true);
                    }}
                  >
                    {text("edit")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setToDelete(template)}>
                    {text("delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateDialog open={open} onOpenChange={setOpen} template={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text("deleteTemplateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {text("deleteTemplateDescription").replace("{title}", toDelete?.title ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{text("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) del.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              {text("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TemplateDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  template: Template | null;
}) {
  const { t, tr } = useI18n();
  const qc = useQueryClient();
  const [language, setLanguage] = useState<string>("CZE");
  const [type, setType] = useState<string>(TEMPLATE_TYPES[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open) return;
    setLanguage(template?.language ?? "CZE");
    setType(template?.type ?? TEMPLATE_TYPES[0]);
    setTitle(template?.title ?? "");
    setBody(template?.body ?? "");
  }, [open, template]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { language, type, title: title.trim(), body };
      const { error } = template
        ? await supabase.from("message_templates").update(payload).eq("id", template.id)
        : await supabase.from("message_templates").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(t("templateSaved"));
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = title.trim() && body.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? t("editTemplate") : t("newTemplate")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("language")} required>
              <Pick value={language} onChange={setLanguage} options={opts(LANGUAGES, tr)} />
            </Field>
            <Field label={t("type")} required>
              <Pick value={type} onChange={setType} options={opts(TEMPLATE_TYPES, tr)} />
            </Field>
          </div>
          <Field label={t("title")} required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={t("messageText")} required>
            <Textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

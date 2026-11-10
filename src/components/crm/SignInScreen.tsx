import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { authRedirectUrl } from "@/lib/app-url";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SignInScreen() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"in" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl() });
        if (error) throw error;
        toast.success(t("accessLinkSent"));
        setMode("in");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-lg border bg-card p-6">
        <div className="text-center">
          <div className="text-lg font-semibold">{t("appName")}</div>
          <div className="text-sm text-muted-foreground">{mode === "in" ? t("signIn") : t("forgotPassword")}</div>
        </div>
        <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
        {mode === "in" && (
          <Input type="password" placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        )}
        <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? t("signIn") : t("sendAccessLink")}</Button>
        <button type="button" className="block w-full text-center text-sm underline" onClick={() => setMode(mode === "in" ? "forgot" : "in")}>
          {mode === "in" ? t("forgotPassword") : t("backToSignIn")}
        </button>
        <p className="text-center text-xs text-muted-foreground">{t("inviteOnlyHint")}</p>
      </form>
    </div>
  );
}

/** Shown after an invite / access link: the employee creates their password (login = their email). */
export function SetPasswordScreen({ onDone, email }: { onDone: () => void; email?: string | undefined }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== repeat) return void toast.error(t("passwordMismatch"));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password, data: { needs_password: false } });
    setBusy(false);
    if (error) return void toast.error(error.message);
    window.history.replaceState(null, "", window.location.pathname);
    toast.success("✓");
    onDone();
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-lg border bg-card p-6">
        <div className="text-center">
          <div className="text-lg font-semibold">{t("appName")}</div>
          <div className="text-sm font-medium">{t("setPasswordTitle")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("setPasswordWelcome")}</p>
        </div>
        {email && <Input type="email" value={email} readOnly autoComplete="username" />}
        <Input type="password" autoComplete="new-password" placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        <Input type="password" autoComplete="new-password" placeholder={t("passwordRepeat")} value={repeat} onChange={(e) => setRepeat(e.target.value)} minLength={6} required />
        <Button type="submit" className="w-full" disabled={busy}>{t("saveAndEnter")}</Button>
      </form>
    </div>
  );
}

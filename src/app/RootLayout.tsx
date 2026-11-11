import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useLocation, useMatches, useRouteError } from "react-router";
import { useEffect, useState } from "react";

import { CrmDialogs, useDialogs } from "@/components/crm/DialogProvider";
import { Toaster } from "@/components/ui/sonner";
import { Pick } from "@/components/crm/Pick";
import { I18nProvider, useI18n, type UiLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { SetPasswordScreen } from "@/components/crm/SignInScreen";
import { AuthProvider, useAuth, canOpenPath } from "@/lib/auth";
import { SignInScreen } from "@/components/crm/SignInScreen";

export const queryClient = new QueryClient();

const DEFAULT_TITLE = "CRM груминг-салона";

/** Sets document.title from the deepest matched route's `handle.title`. */
function usePageTitle() {
  const matches = useMatches();
  const title = [...matches]
    .reverse()
    .map((m) => (m.handle as { title?: string } | undefined)?.title)
    .find(Boolean);
  useEffect(() => {
    document.title = title ?? DEFAULT_TITLE;
  }, [title]);
}

export function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Страница не найдена</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Страница не существует или была перемещена.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RootError() {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Страница не загрузилась
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Что-то пошло не так. Попробуйте обновить страницу или вернуться на главную.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Попробовать снова
          </button>
          <a
            href={import.meta.env.BASE_URL}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}

export function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <CrmDialogs>
            <AuthGate />
            <Toaster />
          </CrmDialogs>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const NAV = [
  { to: "/", labelKey: "dashboard", icon: "🏠" },
  { to: "/kalendar", labelKey: "calendar", icon: "📅" },
  { to: "/klienti", labelKey: "clientBase", icon: "👥" },
  { to: "/groomeri", labelKey: "groomers", icon: "✂️" },
  { to: "/reporty", labelKey: "reports", icon: "📊" },
  { to: "/kassa", labelKey: "cashdesk", icon: "💰" },
  { to: "/sablony", labelKey: "templates", icon: "💬" },
  { to: "/logs", labelKey: "auditLogs", icon: "📜" },
  { to: "/nastaveni", labelKey: "settings", icon: "⚙️" },
] as const;

function QuickBookButton() {
  const { openQuickBooking } = useDialogs();
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={openQuickBooking}
      className="mb-4 w-full rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
    >
      ⚡ {t("quickBooking")}
    </button>
  );
}

function AuthGate() {
  const { loading, session, role, signOut } = useAuth();
  const { t } = useI18n();
  const [linkPassword, setLinkPassword] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const h = window.location.hash + window.location.search;
    if (h.includes("type=invite") || h.includes("type=recovery")) setLinkPassword(true);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setLinkPassword(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  // The invite flag lives on the account, so the password screen shows even if the link's address was already cleaned up.
  const needsPassword =
    !done && (linkPassword || session?.user.user_metadata?.["needs_password"] === true);
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">…</div>
    );
  if (!session) return <SignInScreen />;
  if (needsPassword)
    return (
      <SetPasswordScreen
        email={session.user.email}
        onDone={() => {
          setDone(true);
          setLinkPassword(false);
        }}
      />
    );
  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-semibold">{t("awaitingAccess")}</h1>
          <p className="text-sm text-muted-foreground">{t("awaitingAccessText")}</p>
          <button type="button" className="text-sm underline" onClick={() => void signOut()}>
            {t("signOut")}
          </button>
        </div>
      </div>
    );
  }
  return <RootLayout />;
}

function RootLayout() {
  usePageTitle();
  const { lang, setLang, t } = useI18n();
  const { role, session, signOut, permissions } = useAuth();
  const { pathname } = useLocation();
  const allowed = role ? canOpenPath(role, pathname, permissions) : false;
  const nav = NAV.filter((n) => role && canOpenPath(role, n.to, permissions)).map((n) =>
    role === "groomer" && n.to === "/klienti" ? { ...n, labelKey: "myDogs" as const } : n,
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-56 shrink-0 border-r bg-muted/30 p-4">
        <div className="mb-6">
          <div className="text-base font-semibold">{t("appName")}</div>
          <div className="text-xs text-muted-foreground">{t("appSubtitle")}</div>
        </div>
        {role !== "groomer" && permissions.has("appointments_create") && <QuickBookButton />}
        <nav className="space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                isActive
                  ? "block rounded px-3 py-2 text-sm bg-accent font-medium"
                  : "block rounded px-3 py-2 text-sm hover:bg-accent"
              }
            >
              {"icon" in n ? `${n.icon} ` : ""}
              {t(n.labelKey)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-6">
        <div className="mb-4 flex items-center justify-end gap-3">
          <span className="text-xs text-muted-foreground">{session?.user.email}</span>
          <button type="button" className="text-sm underline" onClick={() => void signOut()}>
            {t("signOut")}
          </button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("language")}</span>
            <Pick
              className="w-32"
              value={lang}
              onChange={(value) => setLang(value as UiLanguage)}
              options={[
                { value: "ru", label: "Русский" },
                { value: "cs", label: "Česky" },
              ]}
            />
          </label>
        </div>
        {allowed ? <Outlet /> : <p className="text-muted-foreground">{t("noAccess")}</p>}
      </main>
    </div>
  );
}

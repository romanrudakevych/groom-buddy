// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RootComponent } from "../RootLayout";
import { strings } from "@/lib/i18n";
import { resetSupabase, signInAs } from "@/test/supabase-mock";

vi.mock("@/integrations/supabase/client", () => import("@/test/supabase-mock"));

const cs = strings.cs;
const PAGES = [
  "kalendar",
  "klienti",
  "groomeri",
  "reporty",
  "kassa",
  "sablony",
  "logs",
  "nastaveni",
];

/** The real root layout with placeholder pages, opened at `path`. */
const openAt = (path: string) =>
  render(
    <RouterProvider
      router={createMemoryRouter(
        [
          {
            path: "/",
            element: <RootComponent />,
            children: [
              { index: true, element: <div>page:home</div> },
              ...PAGES.map((p) => ({ path: p, element: <div>page:{p}</div> })),
            ],
          },
        ],
        { initialEntries: [path] },
      )}
    />,
  );

const navLabels = async () => {
  await screen.findByRole("navigation");
  return screen.getAllByRole("link").map((a) => a.textContent ?? "");
};
const hasLink = (labels: string[], label: string) => labels.some((l) => l.includes(label));

describe("root layout access", () => {
  beforeEach(() => resetSupabase());

  it("shows the sign-in screen without a session", async () => {
    openAt("/");
    expect(await screen.findByRole("button", { name: cs.signIn })).toBeInTheDocument();
  });

  it("asks a signed-in user without a role to wait for access", async () => {
    signInAs(null);
    openAt("/");
    expect(await screen.findByText(cs.awaitingAccess)).toBeInTheDocument();
  });

  it("gives the owner every section", async () => {
    signInAs("owner");
    openAt("/kassa");
    expect(await screen.findByText("page:kassa")).toBeInTheDocument();
    const labels = await navLabels();
    for (const label of [cs.cashdesk, cs.reports, cs.auditLogs, cs.settings]) {
      expect(hasLink(labels, label)).toBe(true);
    }
  });

  it("keeps an admin out of cash, reports and logs even with stale grants", async () => {
    signInAs("admin", { permissions: ["cash_page", "reports", "logs", "appointments_create"] });
    openAt("/kassa");
    expect(await screen.findByText(cs.noAccess)).toBeInTheDocument();
    expect(screen.queryByText("page:kassa")).not.toBeInTheDocument();
    const labels = await navLabels();
    for (const label of [cs.cashdesk, cs.reports, cs.auditLogs, cs.settings]) {
      expect(hasLink(labels, label)).toBe(false);
    }
    expect(hasLink(labels, cs.calendar)).toBe(true);
    expect(screen.getByRole("button", { name: new RegExp(cs.quickBooking) })).toBeInTheDocument();
  });

  it("shows a groomer only their pages, with clients labelled as their dogs", async () => {
    signInAs("groomer", { groomerId: "g1" });
    openAt("/");
    expect(await screen.findByText(cs.noAccess)).toBeInTheDocument(); // dashboard is not theirs
    const labels = await navLabels();
    expect(hasLink(labels, cs.calendar)).toBe(true);
    expect(hasLink(labels, cs.myDogs)).toBe(true);
    for (const label of [cs.dashboard, cs.cashdesk, cs.reports, cs.templates, cs.settings]) {
      expect(hasLink(labels, label)).toBe(false);
    }
    expect(screen.queryByRole("button", { name: new RegExp(cs.quickBooking) })).toBeNull();
  });

  it("unlocks Reports for a groomer with the reports permission", async () => {
    signInAs("groomer", { groomerId: "g1", permissions: ["reports"] });
    openAt("/reporty");
    expect(await screen.findByText("page:reporty")).toBeInTheDocument();
  });
});

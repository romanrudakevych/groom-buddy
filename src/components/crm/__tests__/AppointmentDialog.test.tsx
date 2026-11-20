// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentDialog } from "../AppointmentDialog";
import { I18nProvider, strings } from "@/lib/i18n";
import { saveAppointment, saveLockedAppointmentNotes, type Appointment } from "@/lib/crm";
import { appt, crmData, dog, groomer, service } from "@/lib/__tests__/fixtures";

vi.mock("@/integrations/supabase/client", () => import("@/test/supabase-mock"));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const data = crmData({
  dogs: [dog({ id: "d1", name: "Rex" })],
  groomers: [groomer({ id: "g1", name: "Eva" })],
  services: [service({ id: "sv1", name: "Koupání" })],
});

vi.mock("@/lib/crm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/crm")>()),
  useCrm: () => ({ data, ready: true }),
  saveAppointment: vi.fn(() => Promise.resolve()),
  saveLockedAppointmentNotes: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  useAuth: () => ({ role: "owner", groomerId: null, permissions: new Set(), can: () => true }),
}));

const cs = strings.cs;
const renderDialog = (appointment: Appointment | null) => {
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider>
        <AppointmentDialog open onOpenChange={onOpenChange} appointment={appointment} />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return { onOpenChange, user: userEvent.setup() };
};

describe("AppointmentDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a completed visit read-only and saves only its notes", async () => {
    const done = appt({
      id: "a1",
      dog_id: "d1",
      groomer_id: "g1",
      serviceIds: ["sv1"],
      notes: "old note",
      haircut_notes: "9 mm",
    });
    const { user, onOpenChange } = renderDialog(done);

    expect(screen.getByText(new RegExp(cs.visitLocked))).toBeInTheDocument();
    expect(screen.getByText("Rex")).toBeInTheDocument();
    // Only the two note fields are editable.
    const fields = screen.getAllByRole("textbox");
    expect(fields).toHaveLength(2);

    await user.clear(fields[1]!);
    await user.type(fields[1]!, "new note");
    await user.click(screen.getByRole("button", { name: cs.save }));

    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(saveLockedAppointmentNotes).toHaveBeenCalledWith("a1", "new note", "9 mm");
    expect(saveAppointment).not.toHaveBeenCalled();
  });

  it("keeps Save disabled for an empty new visit", () => {
    renderDialog(null);
    expect(screen.getByText(cs.newVisit)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(cs.visitLocked))).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: cs.save })).toBeDisabled();
  });
});

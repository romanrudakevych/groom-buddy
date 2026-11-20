// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { SignInScreen } from "../SignInScreen";
import { I18nProvider, strings } from "@/lib/i18n";
import { resetSupabase, supabase } from "@/test/supabase-mock";

vi.mock("@/integrations/supabase/client", () => import("@/test/supabase-mock"));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const cs = strings.cs;
const setup = () => {
  render(
    <I18nProvider>
      <SignInScreen />
    </I18nProvider>,
  );
  return userEvent.setup();
};

describe("SignInScreen", () => {
  beforeEach(() => resetSupabase());

  it("signs in with the typed email and password", async () => {
    const user = setup();
    await user.clear(screen.getByPlaceholderText(cs.email));
    await user.type(screen.getByPlaceholderText(cs.email), "eva@salon.cz");
    await user.clear(screen.getByPlaceholderText(cs.password));
    await user.type(screen.getByPlaceholderText(cs.password), "secret123");
    await user.click(screen.getByRole("button", { name: cs.signIn }));

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "eva@salon.cz",
      password: "secret123",
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows the error when sign-in fails", async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: new Error("Invalid login credentials"),
    });
    const user = setup();
    await user.clear(screen.getByPlaceholderText(cs.email));
    await user.type(screen.getByPlaceholderText(cs.email), "eva@salon.cz");
    await user.clear(screen.getByPlaceholderText(cs.password));
    await user.type(screen.getByPlaceholderText(cs.password), "wrong-pass");
    await user.click(screen.getByRole("button", { name: cs.signIn }));

    expect(toast.error).toHaveBeenCalledWith("Invalid login credentials");
  });

  it("sends an access link in forgot-password mode", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: cs.forgotPassword }));
    expect(screen.queryByPlaceholderText(cs.password)).not.toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText(cs.email));
    await user.type(screen.getByPlaceholderText(cs.email), "  eva@salon.cz ");
    await user.click(screen.getByRole("button", { name: cs.sendAccessLink }));

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("eva@salon.cz", {
      redirectTo: expect.any(String),
    });
    expect(toast.success).toHaveBeenCalledWith(cs.accessLinkSent);
    expect(screen.getByRole("button", { name: cs.signIn })).toBeInTheDocument();
  });
});

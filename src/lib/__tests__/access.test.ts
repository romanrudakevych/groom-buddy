import { describe, expect, it } from "vitest";
import { isAdminRestrictedPath, isAdminRestrictedPermission } from "../access";
import { canOpenPath } from "../auth";

describe("administrator restricted sections", () => {
  const stalePermissions = new Set(["cash_page", "reports", "logs", "cash_daily"]);
  it("blocks Cash even with stale granted permissions", () => {
    expect(canOpenPath("admin", "/kassa", stalePermissions)).toBe(false);
    expect(isAdminRestrictedPermission("admin", "cash_page")).toBe(true);
  });
  it("blocks Audit Log even with stale granted permissions", () => {
    expect(canOpenPath("admin", "/logs", stalePermissions)).toBe(false);
    expect(isAdminRestrictedPermission("admin", "logs")).toBe(true);
  });
  it("blocks Reports even with stale granted permissions", () => {
    expect(canOpenPath("admin", "/reporty", stalePermissions)).toBe(false);
    expect(isAdminRestrictedPermission("admin", "reports")).toBe(true);
  });
  it("keeps daily dashboard cash reconciliation available", () => {
    expect(canOpenPath("admin", "/", stalePermissions)).toBe(true);
    expect(isAdminRestrictedPermission("admin", "cash_daily")).toBe(false);
  });
  it("preserves owner access", () => {
    for (const path of ["/kassa", "/reporty", "/logs"]) {
      expect(canOpenPath("owner", path)).toBe(true);
      expect(isAdminRestrictedPath("admin", path + "/details")).toBe(true);
    }
  });
});
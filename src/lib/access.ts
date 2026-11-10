export const ADMIN_RESTRICTED_PERMISSIONS = ["cash_page", "reports", "logs"] as const;

const restrictedPaths = ["/kassa", "/reporty", "/logs"];

export function isAdminRestrictedPath(role: string, pathname: string) {
  return role === "admin" && restrictedPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

export function isAdminRestrictedPermission(role: string | null, permission: string) {
  return role === "admin" && ADMIN_RESTRICTED_PERMISSIONS.some((restricted) => restricted === permission);
}
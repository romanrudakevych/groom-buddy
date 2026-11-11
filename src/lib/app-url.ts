/** Public address for email links (invite / password reset). Set VITE_PUBLIC_URL to the production URL. */
export const PUBLISHED_URL: string | undefined = import.meta.env["VITE_PUBLIC_URL"] || undefined;
export function authRedirectUrl() {
  return PUBLISHED_URL ?? window.location.origin + import.meta.env.BASE_URL;
}

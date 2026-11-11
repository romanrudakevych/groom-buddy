# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Groom Buddy CRM — a CRM for a dog-grooming business with two salons: clients, dogs, visits, groomers, shifts, cash desk, reports and message templates. Vite + React 19 + React Router 7 SPA, TanStack Query, Tailwind v4 / shadcn-ui, Supabase (Postgres + RLS, Auth, Storage, Edge Functions). The UI is in Russian and Czech. `AGENTS.md` lists the domain rules, and they apply here too.

## Commands

```sh
npm run dev                      # Vite dev server, http://localhost:5173 (needs .env from .env.example)
npm run build                    # production build to dist/
npm run lint                     # eslint (prettier runs as an eslint rule)
npm run format                   # prettier --write .
npx tsc --noEmit                 # type-check (no script for it; tsconfig is very strict)
npx vitest run                   # all tests (src/lib/__tests__)
npx vitest run src/lib/__tests__/booking.test.ts   # single file
npx vitest run -t "blocks Cash"                    # single test by name
```

Supabase CLI (a dev dependency; link it once with `npx supabase link --project-ref <ref>`):

```sh
npm run db:new -- <name>         # new supabase/migrations/<timestamp>_<name>.sql
npm run db:push                  # apply pending migrations to the linked remote project
npm run functions:deploy         # deploy the team-admin edge function (--no-verify-jwt; it checks auth itself)
```

The schema exists only as SQL migrations. Never edit an applied migration; add a new one. `src/integrations/supabase/types.ts` holds the generated DB types, so update it when the schema changes.

## Architecture

**Boot**: `src/main.tsx` → `src/app/router.tsx`. Routes use Czech slugs (`/kalendar`, `/klienti/:clientId`, `/psi/:dogId`, `/groomeri`, `/kassa`, `/reporty`, `/sablony`, `/logs`, `/nastaveni`), and the page title comes from `handle.title`. `src/app/RootLayout.tsx` stacks the providers (QueryClient → I18n → Auth → `CrmDialogs`), shows the sign-in or set-password screens, builds the nav and blocks pages the user may not open.

**Data layer (`src/lib/crm.ts`)**: a single TanStack query (`["crm"]`) runs `fetchAll`, which loads every table the user can see and maps the rows to a denormalized `CrmData` (for example `client.dogIds`, `dog.clientIds`, `appointment.serviceIds` from `appointment_services`). Pages read it with `useCrm()`. All writes are async functions in the same file (`saveClient`, `saveDog`, `saveAppointment`, `saveCashOp`, …), run through `useCrmMutation(fn)`, which invalidates `["crm"]` on success. Domain helpers live there as well: pricing (`sizePrice`, `servicePriceForDog`), dates (`toISO`, `mondayOf`, `todayISO`), `czk` formatting, and `isAppointmentLocked` (a completed visit is locked, and only its notes can still change via `saveLockedAppointmentNotes`). Pure slot and duration math for booking is in `src/lib/booking.ts`.

**Stored values are Czech literals**: statuses, sizes, coats, cash-operation types, service names and similar values are saved as Czech strings (`"Naplánováno"`, `"Dokončeno"`, `"Vklad"`, …), defined as `as const` arrays in `crm.ts`. Do not change these values. Translate them only for display.

**i18n (`src/lib/i18n.tsx`)**: `useI18n()` gives `t(key)` for UI strings (the `ru` and `cs` dictionaries; `TranslationKey` comes from `ru`, so a new key must exist in both) and value translation for stored values (`valueTranslations`, `localizedOptions`, `translatedServiceNames`). Czech is the default, and the choice is saved in localStorage. All visible text goes through this module.

**Auth and permissions**: there are three roles, `owner | admin | groomer`, in `user_roles` (which also holds a groomer's `groomer_id`). The permission keys are in `PERMISSIONS` in `src/lib/auth.tsx`. Effective permissions are the `role_permissions` defaults with the per-user `user_permissions` overrides applied on top; the owner has every permission. `useAuth()` exposes `role`, `groomerId`, `permissions` and `can(p)`. Page access goes through `canOpenPath` (`ROLE_PATHS` plus pages unlocked by permissions). `src/lib/access.ts` sets fixed admin restrictions (cash page, reports, logs) that override even a stale grant. Navigation, page checks and the Settings permission controls must all use it. The client-side checks only hide UI. The real enforcement is RLS in the migrations (`has_role`, `is_staff`, `my_groomer_id`, `has_permission` helpers), so any new access rule must also be added as a database policy. For groomer finance indicators, use `canSeeGroomerFinances` in `src/lib/groomer-finances.ts`.

**Domain model**: each dog has exactly one main owner, `dogs.owner_id`. Extra family contacts are stored as JSON in `clients.additional_contacts`. `client_dogs` is deprecated; the dog is the primary object. Dog photos are kept in the private Storage bucket `dog-photos` and read through signed URLs (`dogPhotoSignedUrl`).

**Dialogs**: `src/components/crm/DialogProvider.tsx` mounts the create/edit dialogs for clients, dogs, groomers, appointments and quick booking once, and pages open them with `useDialogs()`. Calendar quick view (`AppointmentQuickView`) is read-only. Edits and new visits go through `AppointmentDialog`, so there is only one save path. The auth and dialog contexts are cached on `globalThis` to survive HMR, and that pattern should stay.

**Team management**: the owner-only actions (invite, one-time access link, delete user) run in the `supabase/functions/team-admin` edge function (Deno), called from `src/lib/team.api.ts`. ESLint ignores `supabase/functions`. Email links use `VITE_PUBLIC_URL` (`src/lib/app-url.ts`) and fall back to the current origin.

**UI**: `src/components/ui` is generated shadcn code. Shared CRM building blocks are in `src/components/crm` (`ui.tsx`, `Pick`, `SearchPick`, `SlotPicker`). The import alias is `@/*` → `src/*`.

## Conventions

- `tsconfig` turns on `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noPropertyAccessFromIndexSignature`, so index access returns `T | undefined` and env vars use bracket access (`import.meta.env["VITE_…"]`).
- Hosting is a static SPA. Unknown paths fall back to `index.html` via `public/_redirects` (Netlify/Cloudflare) and `vercel.json`. GitHub Pages (`.github/workflows/deploy-pages.yml`) serves it from `/groom-buddy/`: the build sets `VITE_BASE`, the router uses `import.meta.env.BASE_URL` as basename, and `404.html` (a copy of `index.html`) is the fallback.

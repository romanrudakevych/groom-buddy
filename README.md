# Groom Buddy CRM

CRM for grooming salons: clients, dogs, visits, groomers, shifts, cash desk, reports and message templates (Russian / Czech UI).

Stack: Vite + React 19 + React Router, TanStack Query, Tailwind v4 / shadcn-ui, Supabase (Postgres, Auth, Storage, Edge Functions).

## Setup

```sh
npm install
cp .env.example .env   # fill in your Supabase URL and publishable key
npm run dev            # http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`, `npx vitest run`.

## Supabase

- **Schema**: SQL migrations in `supabase/migrations/`, managed with the Supabase CLI (installed as a dev dependency):
  ```sh
  npx supabase login                         # once
  npx supabase link --project-ref <ref>      # once per machine
  npm run db:new -- <name>                   # creates supabase/migrations/<timestamp>_<name>.sql
  npm run db:push                            # applies pending migrations to the linked project
  ```
- **Storage**: private bucket `dog-photos` (policies come from migration `0002`).
- **Auth**: email + password. The first user created becomes the owner; staff are invited from Settings. Set Site URL / redirect URLs in Authentication → URL Configuration.
- **Edge Function** `team-admin` (owner-only invite, access link, delete user):
  ```sh
  npm run functions:deploy
  ```

## Hosting

It's a static SPA (`dist/`). Unknown paths must fall back to `index.html`: `public/_redirects` covers Netlify / Cloudflare Pages, `vercel.json` covers Vercel. Set `VITE_PUBLIC_URL` to the production URL so email links point there.

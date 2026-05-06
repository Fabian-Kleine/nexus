# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (localhost:4321)
pnpm build        # Production build
pnpm typecheck    # Astro + TypeScript type checking
pnpm lint         # ESLint
pnpm format       # Prettier (ts, tsx, astro)

pnpm db:push      # Apply schema changes to the DB (no migration files)
pnpm db:generate  # Generate migration SQL files via drizzle-kit
pnpm db:studio    # Open Drizzle Studio UI for the DB
```

There are no automated tests. Type-check with `pnpm typecheck` before committing.

## Architecture

Nexus is an **Astro 5 SSR** application (`output: "server"`, `@astrojs/node` standalone adapter). All pages and API routes are server-rendered. React components are mounted as islands via `client:load`.

### Request flow

```
Browser → Astro page (.astro) → renders AppLayout (React island)
                              → children rendered as static HTML slots

Browser → /api/* → Astro API route (.ts) → lib/ helpers → PostgreSQL
```

### API authentication

Every protected API route calls `validateApiKey(request, service)` from `src/lib/auth.ts`. This:
1. Reads the `x-api-key` header
2. SHA-256 hashes it and queries `api_keys` table
3. Checks `is_active` and the relevant service flag in the `services` JSONB column
4. Returns the key row or `null`

The four service flags are: `email`, `filesRead`, `filesWrite`, `dbRead`.

### Database (Drizzle ORM)

Schema is defined in `src/lib/db/schema.ts`. The Drizzle client singleton is in `src/lib/db/index.ts` (uses `postgres` driver). Four tables: `api_keys`, `email_templates`, `sent_emails`, `files`.

Use `pnpm db:push` during development — it applies schema diffs directly without generating migration files. Run `pnpm db:generate` when you need versioned migration SQL.

### Email

`src/lib/mailer.ts` exports a nodemailer `transporter` (configured from `MAIL_*` env vars) plus two utilities: `renderTemplate(html, vars)` replaces `{{var}}` placeholders via regex string replace (not eval), and `extractVariables(html)` returns a deduplicated list of variable names found in a template.

### File storage

`src/lib/file-storage.ts` stores files under `./uploads/public/` or `./uploads/private/` (resolved from `UPLOADS_DIR` env var, defaulting to `./uploads`). Stored filename is `{nanoid}{ext}` — never the original name. Public files are served statically; private files stream through `/api/files/[id]` after auth.

### Layout system

Two Astro layouts:
- `src/layouts/main.astro` — bare HTML shell with global CSS and Geist font
- `src/layouts/app.astro` — wraps `main.astro` and mounts `AppLayout` (React, `client:load`), which renders the shadcn `SidebarProvider` + `AppSidebar` + `Toaster`

All app pages use `app.astro`. The current path is passed from Astro's `Astro.url.pathname` into `AppLayout` to highlight the active sidebar item.

### UI components

shadcn/ui components live in `src/components/ui/`. Feature components are organized by domain: `src/components/emails/`, `src/components/files/`, `src/components/database/`, `src/components/api-keys/`, `src/components/dashboard/`. All feature components are React and fetch data from `/api/*` routes at runtime.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `UPLOADS_DIR` | Base directory for file storage (default: `./uploads`) |
| `MAIL_HOST` | SMTP host |
| `MAIL_PORT` | SMTP port (465 = implicit TLS) |
| `MAIL_USER` | SMTP username / from address |
| `MAIL_PASS` | SMTP password |

### Path alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

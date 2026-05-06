# Nexus

<video
src="https://github.com/Fabian-Kleine/project-showcases/raw/refs/heads/main/nexus.mp4"
preload="metadata"
autoplay
muted
loop
/>

A self-hosted API management hub built with Astro, React, and PostgreSQL. Exposes REST endpoints for sending emails and storing files, with a full admin UI for managing API keys, email templates, sent email history, and a read-only database explorer.

## Stack

- **Astro 5** (SSR via `@astrojs/node`) + **React** islands
- **Drizzle ORM** + **PostgreSQL**
- **Nodemailer** for email delivery
- **shadcn/ui** + **Tailwind CSS 4**
- **Monaco Editor** for HTML template editing

## Setup

**1. Install dependencies**

```bash
pnpm install
```

**2. Configure environment variables**

Copy `.env` and fill in your values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/nexus
UPLOADS_DIR=./uploads

MAIL_HOST=smtp.example.com
MAIL_PORT=465
MAIL_USER=no-reply@example.com
MAIL_PASS=your-smtp-password
MASTER_PASSWORD=change-me
```

**3. Push the database schema**

```bash
pnpm db:push
```

**4. Start the dev server**

```bash
pnpm dev
# → http://localhost:4321
```

## Commands

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start dev server                   |
| `pnpm build`       | Production build                   |
| `pnpm preview`     | Preview production build           |
| `pnpm typecheck`   | Type-check with Astro + TypeScript |
| `pnpm lint`        | Run ESLint                         |
| `pnpm format`      | Format with Prettier               |
| `pnpm db:push`     | Apply schema changes to DB         |
| `pnpm db:generate` | Generate migration SQL files       |
| `pnpm db:studio`   | Open Drizzle Studio                |

## Features

### API Keys

Create API keys and control which services each key can access: **Email**, **Files Read**, **Files Write**, **DB Read**. Keys are stored as SHA-256 hashes — the raw key is shown only once at creation.

### Email (`POST /api/email/send`)

Send transactional emails via SMTP. Optionally reference a saved template by ID and pass `variables` to replace `{{placeholder}}` tokens. All sent emails (including failures) are saved to the database.

```bash
curl -X POST http://localhost:4321/api/email/send \
  -H "x-api-key: nxs_..." \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","subject":"Hi","bodyHtml":"<p>Hello</p>"}'
```

### Email Templates

Create reusable HTML email templates with a Monaco editor and a live iframe preview. Variables are auto-detected from `{{name}}` syntax and can be given preview values in the sidebar.

### Master Password Gate

Set `MASTER_PASSWORD` to require a password before accessing the Nexus UI and internal admin APIs. External API endpoints that already require `x-api-key` continue to work for integrations.

### File Storage (`POST /api/files/upload`)

Upload files as **public** (served statically at `/uploads/public/{filename}`) or **private** (streamed through `/api/files/{id}` with API key auth). Accepts `multipart/form-data`.

```bash
curl -X POST http://localhost:4321/api/files/upload \
  -H "x-api-key: nxs_..." \
  -F "file=@photo.jpg" \
  -F "isPublic=true"
```

### Database Explorer

Browse any PostgreSQL table with pagination. Requires an API key with the **DB Read** service enabled. Read-only — no writes exposed.

## API Reference

All endpoints require an `x-api-key` header unless noted.

| Method             | Path                   | Service       | Description                    |
| ------------------ | ---------------------- | ------------- | ------------------------------ |
| `POST`             | `/api/email/send`      | `email`       | Send an email                  |
| `GET`              | `/api/emails`          | —             | Sent email history (paginated) |
| `GET/POST`         | `/api/templates`       | —             | List / create templates        |
| `GET/PATCH/DELETE` | `/api/templates/:id`   | —             | Get / update / delete template |
| `POST`             | `/api/files/upload`    | `filesWrite`  | Upload a file                  |
| `GET`              | `/api/files/list`      | —             | List all files                 |
| `GET`              | `/api/files/:id`       | `filesRead`\* | Download a file                |
| `DELETE`           | `/api/files/:id`       | `filesWrite`  | Delete a file                  |
| `GET/POST`         | `/api/keys`            | —             | List / create API keys         |
| `PATCH/DELETE`     | `/api/keys/:id`        | —             | Update / delete API key        |
| `GET`              | `/api/database/tables` | `dbRead`      | List DB tables                 |
| `GET`              | `/api/database/:table` | `dbRead`      | Query table rows               |

\*Public files are served without auth.

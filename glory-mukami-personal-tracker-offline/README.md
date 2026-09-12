# Glory Mukami's Personal Tracker

A personal, offline-first tracker for workouts, nutrition, journaling, and daily time planning — a single-page React app backed by an Express/tRPC server and MongoDB.

## Features

- **Workout Studio** — logs lifted sets with volume, rest, and personal records; includes motion demos for core/glute exercises and video/poster references.
- **Day Planner** — an hour-by-hour planner for the Time page.
- **Nutrition & Records** — meals tracked against personal records, with meal memory and a grocery link.
- **Journal** — a calendar-based journal with a command-palette search (Cmd+K) reachable from anywhere in the app.
- **Settings** — priorities, memory, reminders, and backup configuration.
- **Timers** — rest/interval timers that persist across navigation via a global timer bar.
- **Google Sign-In** — accounts survive reinstalling the app, backed by Google OAuth (web + Android).

## Tech stack

- **Client:** React 19, Vite, Tailwind CSS, Radix UI, TanStack Query, wouter (routing), tRPC client
- **Server:** Express, tRPC, Drizzle ORM
- **Database:** MongoDB (Atlas) for journal/user data; Drizzle migrations for relational data
- **Tooling:** TypeScript, Vitest, Prettier, pnpm

## Project structure

```
client/        React frontend (src/components, src/pages, src/contexts, src/hooks)
server/        Express + tRPC backend (_core for framework glue, routers.ts for API routes)
shared/        Types and constants shared between client and server
drizzle/       Database schema and migrations
docs/          Project documentation (see docs/README.md)
scripts/       Utility scripts (e.g. MongoDB backup)
media/         Local wallpapers, workout videos, and posters referenced by the app
```

## Getting started

### Prerequisites

- Node.js and [pnpm](https://pnpm.io/)
- A MongoDB connection string (e.g. MongoDB Atlas)
- Google OAuth credentials (web + Android client IDs)

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment template and fill in the required values:

   ```bash
   cp .env.example .env
   ```

   See `.env.example` for details on each variable, including `MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_ID_ANDROID`.

3. Start the development server:

   ```bash
   pnpm dev
   ```

### Available scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run the app in development mode |
| `pnpm build` | Build the client and bundle the server for production |
| `pnpm start` | Run the production build |
| `pnpm check` | Type-check the project |
| `pnpm format` | Format the codebase with Prettier |
| `pnpm test` | Run the test suite with Vitest |
| `pnpm db:push` | Generate and run Drizzle migrations |

## Database backup

MongoDB Atlas's free tier has no automated backups and pauses after ~60 days idle. Use `scripts/backup-mongo.sh` to back up the database manually.

## Documentation

Further project documentation (audits, inspections, verification records, and planning notes) lives under [`docs/`](docs/README.md).

## License

MIT

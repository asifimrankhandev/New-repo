# RefundBeacon

**A clear next step for stuck refunds.** RefundBeacon helps US shoppers organize a returned
purchase whose refund hasn’t arrived: record the case, keep the evidence together, see the next
sensible step (and why), set reminders, draft a follow-up and record the outcome — all on the
device, with no account, inbox or bank access.

> Working name, not cleared for trademark or store use. The product is in the validation stage
> described in the planning guide; this repository is the local-first MVP.

## Stack

| Concern    | Choice                                                                         |
| ---------- | ------------------------------------------------------------------------------ |
| Framework  | Expo SDK 58 · React Native 0.88 · React 19.3 (React Compiler enabled)          |
| Navigation | Expo Router (file-based, typed routes, native tabs)                            |
| Data       | `expo-sqlite` + Drizzle ORM (typed schema, generated migrations, live queries) |
| Validation | Zod 4 (forms, backups, preferences)                                            |
| Files      | `expo-file-system` (app-private evidence storage)                              |
| Reminders  | `expo-notifications` (local only)                                              |
| Language   | TypeScript (strict, `noUncheckedIndexedAccess`)                                |
| Quality    | ESLint (`eslint-config-expo` + kebab-case file rules), Prettier, Jest          |

No backend, no analytics, no AI. Money is stored as integer cents; calendar dates as
`YYYY-MM-DD`; moments as epoch milliseconds.

## Getting started

Requires Node.js 22 LTS (see `.nvmrc`).

```bash
npm ci
npm start          # Expo dev server
npm run android    # or: npm run ios
```

The app uses native modules beyond Expo Go’s set (SQLite change listeners, notifications
channels, date picker), so use a development build: `npx expo run:android` / `npx expo run:ios`,
or `eas build --profile development`.

## Scripts

| Script                | What it does                                                  |
| --------------------- | ------------------------------------------------------------- |
| `npm run validate`    | Typecheck, lint, format check and unit tests                  |
| `npm run typecheck`   | `tsc --noEmit`                                                |
| `npm run lint`        | ESLint, including kebab-case file/folder rules                |
| `npm run format`      | Prettier write                                                |
| `npm test`            | Jest unit tests for the domain rules                          |
| `npm run db:generate` | Generate a Drizzle migration after editing `src/db/schema.ts` |

## Project structure

All file and folder names are kebab-case (enforced by ESLint). Expo Router conventions
(`_layout.tsx`, `(tabs)`, `[id]`) are the only exceptions; generated Drizzle migration files are
excluded.

```
src/
  app/                    Routes only (Expo Router). Each file is a screen.
    (tabs)/               Cases · Reminders · Archive · Settings
    case/new.tsx          4-step new-case wizard
    case/[id]/            Detail, edit, add event, evidence, follow-up, reminder, outcome, export
  components/ui/          Design-system primitives (text, buttons, fields, chips, cards…)
  constants/              App-wide constants
  db/                     Drizzle schema, client and generated migrations
  domain/                 Pure business rules + unit tests (money, dates, next step,
                          readiness, reconciliation, follow-up template, summaries, validation)
  features/               Feature modules: repositories, services and feature components
    app/ backup/ cases/ evidence/ export/ outcome/ reminders/ settings/ timeline/
  lib/                    Small framework helpers (forms, dialogs, ids, time)
  theme/                  Design tokens (Swiss Paper, light + dark), typography
docs/                     Privacy data inventory, release checklist
```

Layering rule: `domain` imports nothing from React Native or Expo; `features` own persistence
and side effects; `app` routes compose features and UI primitives.

## Product guardrails (from the planning guide)

- Never claims a refund is owed or guaranteed; summaries carry a disclaimer.
- Every next-step suggestion is deterministic, shows the recorded facts it used, and can be
  dismissed (“Doesn’t fit”) until the facts change.
- Dates carry their source (retailer message, policy, carrier, estimate).
- Store credit and exchanges are never counted as cash; remaining balances are arithmetic only
  and shown as “—” when the expected amount is unknown.
- Notification permission is requested only when the user sets a reminder.
- Messages are drafted, never sent; the user copies or shares them.
- Exports are previewed exactly as shared, with per-field and per-file inclusion controls.

## Design

The UI follows the “Swiss Paper” direction: off-white paper, ink, one signal-orange accent,
Inter Tight + Geist Mono. Screen designs live in the design canvas shared alongside this repo.

## Data & privacy

See [`docs/privacy-data-inventory.md`](docs/privacy-data-inventory.md). Before release, work
through [`docs/release-checklist.md`](docs/release-checklist.md).

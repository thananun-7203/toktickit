# TokTickIT — IT Service Desk

TokTickIT is a full-stack IT service request application. Lab 2 delivered the requester-facing ticketing MVP and Zen Green UI foundation. Lab 3 extends it with real authentication, Requester session ownership, IT Staff queue/operations, Public Comments versus Internal Notes, Administrator User Management, migration/regression protection, and full role-based E2E/security verification.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Bootstrap 5
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Attachment storage:** SeaweedFS filer
- **Testing:** Vitest, Supertest, Playwright
- **Local services:** Docker Compose (`compose.lab2.yml`)

## Repository Structure

```text
toktickit/
├── client/                         # React requester UI
├── server/                         # Express API + Prisma
│   ├── prisma/                     # schema, migrations, seed
│   ├── src/
│   ├── tests/lab-02/
│   └── tests/lab-03/
├── e2e/
│   ├── lab-02/                     # historical Lab 2 Playwright flow
│   └── lab-03/                     # Lab 3 Auth/Requester/Staff/Admin E2E + visual QA
├── docs/lab-02/                    # historical Lab 2 documentation/evidence
├── docs/lab-03/                    # Lab 3 spec, API/UI/test/review/AI/evidence docs
├── artifacts/lab-02/screenshots/   # historical Lab 2 visual evidence
├── artifacts/lab-03/screenshots/   # final Lab 3 visual evidence
├── .github/workflows/ci.yml        # server/client/Lab 3 E2E CI
├── compose.lab2.yml                # PostgreSQL + SeaweedFS
└── README.md
```

## Prerequisites

- Node.js + npm
- Git
- Docker Desktop (recommended for PostgreSQL + SeaweedFS)

## Recommended Lab 2 Local Setup

### 1. Start PostgreSQL and SeaweedFS

From the repository root:

```bash
docker compose -f compose.lab2.yml up -d
```

The compose file exposes:

- PostgreSQL: `localhost:5433`
- SeaweedFS master: `localhost:9333`
- SeaweedFS filer: `localhost:8888`

For this Docker database, use:

```text
postgresql://toktickit:toktickit@localhost:5433/toktickit?schema=public
```

### 2. Configure and prepare the server

```bash
cd server
npm install
copy .env.example .env
```

If using `compose.lab2.yml`, update `server/.env` so it contains:

```env
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5433/toktickit?schema=public"
PORT=3000
CLIENT_ORIGIN="http://localhost:5173"
SEAWEEDFS_FILER_URL="http://localhost:8888"
```

Apply the Prisma migrations, generate the client, and seed the reference data:

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

Start the API:

```bash
npm run dev
```

Default API URL: `http://localhost:3000`.

### 3. Configure and start the client

In another terminal:

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

The default client environment points to `http://localhost:3000`. Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

## Lab 2 Development Requester Context (historical)

Lab 2 intentionally does **not** implement real authentication. On entry, select an active Development Requester from the dropdown. Ticket-scoped requests send the simulated identity through:

```text
X-Dev-Requester-Id: <requesterId>
```

This was the Lab 2 development/testing identity mechanism only. Lab 3 Issue 3 retires the selector, public Requester directory, and runtime `X-Dev-Requester-Id` identity path; current Requester ownership comes from the authenticated server session.

## Lab 3 Local Authentication Seed

Lab 3 adds real `User` accounts and DB-backed sessions. The seed creates local-only demo accounts whose initial passwords must be changed on first login. These credentials are intentionally non-production test data:

| Role | Example seeded email | Initial password |
|---|---|---|
| Requester | `somchai@toktick.it` | `RequesterInit123` |
| IT Staff | `narin.staff@toktick.it` | `StaffInit123` |
| Administrator | `admin.one@toktick.it` | `AdminInit123` |

The database stores only bcrypt hashes, never these plaintext values. Additional seeded users of the same role use the same local initial password for course testing. The Lab 2 `X-Dev-Requester-Id` compatibility path remains temporarily available during Lab 3 Issue 2 and is removed from the normal workflow in Issue 3.

## Running Tests

### Server unit/API regression

Server tests are deliberately blocked from using the normal development database. Configure a separate test target in `server/.env` (see `.env.example`):

```env
TEST_DATABASE_URL="postgresql://toktickit:toktickit@localhost:5435/toktickit_test?schema=public"
```

`npm test` fails before Prisma opens a connection when `TEST_DATABASE_URL` is missing, its database name does not contain `test`, or it resolves to the same database/schema as `DATABASE_URL`. Migrate and seed that isolated test database before running the DB-backed suite.

```bash
cd server
npm test
npm run build
npx prisma validate
```

### Client UI regression

```bash
cd client
npm test
npm run build
```

### Playwright E2E

Install E2E dependencies once:

```bash
cd e2e
npm install
npx playwright install chromium
```

The current Lab 3 Playwright configuration starts its own server on port `3001` and client on `5174`, but it expects a **fresh migrated/seeded E2E PostgreSQL database** and SeaweedFS to already be available. The E2E database must be separate from the normal development database because the flow changes seeded Requester passwords and creates test Tickets.

Run:

```bash
npm test
```

`npm test` runs the current Lab 3 suite through `playwright.lab3.config.ts`. The historical Lab 2 Playwright flow remains available explicitly as `npm run test:lab2` and is not the current default.

Set `E2E_DATABASE_URL` to the fresh E2E database before running Playwright. Example PowerShell:

```powershell
$env:E2E_DATABASE_URL="postgresql://toktickit:toktickit@127.0.0.1:5440/toktickit_issue7_e2e?schema=public"
npm test
```

Lab 3 Playwright intentionally has no database fallback. If `E2E_DATABASE_URL` is missing, the suite fails before starting its web servers so it cannot silently reuse an older or development database.

## Lab 2 Documentation

- `docs/lab-02/specification.md` — scope, FR/BR/AC, decisions, data design
- `docs/lab-02/api-spec.md` — requester-ticket API contract
- `docs/lab-02/ui-spec.md` — Zen Green screens and responsive behavior
- `docs/lab-02/tests.md` — test plan, traceability, final regression record
- `docs/lab-02/reviewer.md` — peer-review history and PR evidence
- `docs/lab-02/ai-use.md` — LLM/model, selected prompts, assistance log, reflection
- `docs/lab-02/evidence.md` — final screenshot/API/review evidence index

## Lab 3 Documentation

- `docs/lab-03/specification.md` — final Sprint 3 FR/BR/AC, authorization, migration, and design decisions
- `docs/lab-03/api-spec.md` — final authenticated Requester/Staff/Admin REST contract
- `docs/lab-03/ui-spec.md` — Login, Change Password, Requester, Staff, Administrator, and responsive UI contract
- `docs/lab-03/tests.md` — planned-to-final test traceability plus regression/E2E evidence
- `docs/lab-03/reviewer.md` — PR #41–#47 peer-review history and Issue #40/release review record
- `docs/lab-03/ai-use.md` — GPT-5.6 Sol prompt selection, assistance log, debugging example, and reflection
- `docs/lab-03/evidence.md` — final Answer Part 1–9 evidence index and screenshot mapping

## Git Workflow

- `main` — stable/released code
- `lab2-staging` — historical Lab 2 integration branch
- `lab3-staging` — Lab 3 integration/release-candidate branch
- `feature/<issue>-...` — one feature branch per GitHub Issue

Lab 3 feature branches are peer-reviewed through PRs into `lab3-staging`. Issues #33–#39 and PRs #41–#47 contain the implemented Sprint 3 increment. Issue #40 performs the final evidence/release-readiness audit. The final release remains a separate reviewed PR from `lab3-staging` to `main`; it must not be merged until Issue #40 is approved and the student explicitly authorizes the release merge.

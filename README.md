# TokTickIT — IT Service Desk

TokTickIT is a full-stack IT service request application. Lab 2 delivered the requester-facing ticketing MVP and Zen Green UI foundation. Lab 3 added authenticated Requester ownership, IT Staff operations, Public Comments versus Internal Notes, and Administrator User Management. Lab 4 adds Actions Taken, follow-up/Resolution Gate workflow, Staff and Requester Dashboards, Administrator account summaries, and expanded security, regression, responsive, accessibility, and visual verification.

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
│   ├── tests/lab-03/
│   └── tests/lab-04/
├── e2e/
│   ├── lab-02/                     # historical Lab 2 Playwright flow
│   ├── lab-03/                     # Lab 3 Auth/Requester/Staff/Admin E2E
│   └── lab-04/                     # Lab 3 regression + Lab 4 full-stack E2E and UI QA
├── docs/lab-02/                    # historical Lab 2 documentation/evidence
├── docs/lab-03/                    # Lab 3 spec, API/UI/test/review/AI/evidence docs
├── docs/lab-04/                    # Lab 4 spec, API/UI/test/review/AI/evidence docs
├── artifacts/lab-02/screenshots/   # historical Lab 2 visual evidence
├── artifacts/lab-03/screenshots/   # final Lab 3 visual evidence
├── artifacts/lab-04/screenshots/   # consolidated Lab 4 final evidence: responsive, live DB, empty/error states
├── artifacts/lab-04/issue-58/      # Lab 4 responsive fixture + live-DB QA screenshots
├── .github/workflows/ci.yml        # server/client/Lab 3 regression + Lab 4 full-stack E2E CI
├── compose.lab2.yml                # PostgreSQL + SeaweedFS
└── README.md
```

## Prerequisites

- Node.js + npm
- Git
- Docker Desktop (recommended for PostgreSQL + SeaweedFS)

## Local Setup (Labs 2–4)

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

The database stores only bcrypt hashes, never these plaintext values. Additional seeded users of the same role use the same local initial password for course testing. Current Requester ownership is derived from the authenticated server session; the historical Lab 2 `X-Dev-Requester-Id` identity path is not part of the current workflow.

## Lab 4 Features

- **Actions Taken:** Staff/Admin create, edit, reassign, start, complete, and cancel Actions; Requesters see a read-only Action history.
- **Follow-up and Resolution Gate:** current-workflow-cycle Action and follow-up requirements are enforced by the backend and reflected in Ticket Detail.
- **Dashboards:** IT Staff/Administrator use the operational Staff Dashboard; Requesters receive an ownership-protected Requester Dashboard.
- **Administrator summary:** User Management displays database-derived total/per-role counts independently of visible list filters.
- **Evidence:** final submission screenshots are consolidated under `artifacts/lab-04/screenshots/`; the original Issue #58 source screenshots remain preserved under `artifacts/lab-04/issue-58/`. Fixture, live Development DB, and empty/error boundary screenshots are distinguished in `docs/lab-04/tests.md` and `docs/lab-04/evidence.md`.

## Running Tests

### Server unit/API regression

Server tests are deliberately blocked from using the normal development database. Use a disposable PostgreSQL database whose name contains `test`. The example below uses a separate Compose project on port `5434`; the normal local Compose setup above uses port `5433`. Start the test service and create the test databases once:

```env
TEST_DATABASE_URL="postgresql://toktickit:toktickit@localhost:5434/toktickit_test?schema=public"
```

```powershell
# Use a separate Compose project/volume so the test services do not reuse
# the normal Development PostgreSQL container or its data volume.
$env:TOKTICKIT_POSTGRES_PORT = "5434"
docker compose -p toktickit-test -f compose.lab2.yml up -d --wait
docker compose -p toktickit-test -f compose.lab2.yml exec -T postgres createdb -U toktickit toktickit_test
docker compose -p toktickit-test -f compose.lab2.yml exec -T postgres createdb -U toktickit toktickit_lab4_e2e
```

`npm test` fails before Prisma opens a connection when `TEST_DATABASE_URL` is missing, its database name does not contain `test`, or it resolves to the same database/schema as `DATABASE_URL`. Apply migrations and seed only the disposable test database before running the DB-backed suite. PowerShell example:

```powershell
cd server
$env:TEST_DATABASE_URL = "postgresql://toktickit:toktickit@localhost:5434/toktickit_test?schema=public"
# Set this to the actual normal Development DATABASE_URL used on your machine.
$env:TOKTICKIT_DEVELOPMENT_DATABASE_URL = "postgresql://toktickit:toktickit@localhost:5433/toktickit?schema=public"
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npx prisma migrate deploy
npx prisma db seed
npx prisma validate
Remove-Item Env:DATABASE_URL
npm test -- --maxWorkers=1 --minWorkers=1
npm run build
Remove-Item Env:TEST_DATABASE_URL
Remove-Item Env:TOKTICKIT_DEVELOPMENT_DATABASE_URL
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

The Lab 3 and Lab 4 full-stack Playwright configurations start their own API on port `3001` and client on `5174`, but expect a **separate migrated/seeded E2E PostgreSQL database** and SeaweedFS to be available. The E2E database must not be the normal Development database because the flows change seeded Requester passwords and create test Tickets and Actions.

Run:

```bash
npm test
```

`npm test` / `npm run test:lab3` run the Lab 3 suite through `playwright.lab3.config.ts`. `npm run test:lab4` runs the full-stack configuration containing both Lab 3 regression specs and all Lab 4 E2E/UI specs. The historical Lab 2 Playwright flow remains available explicitly as `npm run test:lab2`.

The same isolated Compose project can host both disposable databases. Create each database only once; do not use `docker compose down -v`, because that deletes the project's persistent test volume. Example PowerShell (the database name must include `test`, `tests`, or `e2e`):

```powershell
# Run this once if the disposable E2E database has not been created yet.
docker compose -p toktickit-test -f compose.lab2.yml exec -T postgres createdb -U toktickit toktickit_lab4_e2e
$env:E2E_DATABASE_URL="postgresql://toktickit:toktickit@127.0.0.1:5434/toktickit_lab4_e2e?schema=public"
$env:SEAWEEDFS_FILER_URL="http://127.0.0.1:8888"
# Set this to the actual normal Development DATABASE_URL used on your machine.
$env:TOKTICKIT_DEVELOPMENT_DATABASE_URL="postgresql://toktickit:toktickit@127.0.0.1:5433/toktickit?schema=public"
cd server
$env:DATABASE_URL=$env:E2E_DATABASE_URL
npx prisma migrate deploy
npx prisma db seed
Remove-Item Env:DATABASE_URL
cd ../e2e
npm run test:lab4
Remove-Item Env:E2E_DATABASE_URL
Remove-Item Env:SEAWEEDFS_FILER_URL
Remove-Item Env:TOKTICKIT_DEVELOPMENT_DATABASE_URL
```

For the server regression, set `TEST_DATABASE_URL` to `toktickit_test`, set `DATABASE_URL` to that same isolated test URL only while applying migrations/seeding, remove `DATABASE_URL`, then run `npm test -- --maxWorkers=1 --minWorkers=1`. This keeps the test runner's explicit target guard active. The normal Development service remains separate on its own configured port/Compose project.

Playwright intentionally has no database fallback. The E2E guard requires a database name containing a test/e2e marker and rejects a target matching `TOKTICKIT_DEVELOPMENT_DATABASE_URL`. **Always set `TOKTICKIT_DEVELOPMENT_DATABASE_URL` to the actual Development DB URL before running Playwright locally**; without it, the guard cannot compare the E2E target against Development. CI supplies the repository's reserved default Development DB identity for this comparison while creating and using only the dedicated E2E database. If `E2E_DATABASE_URL` is missing or unsafe, the suite fails before starting its web servers.

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

## Lab 4 Documentation

- `docs/lab-04/specification.md` — approved Sprint 4 scope, business rules, acceptance criteria, and decisions
- `docs/lab-04/api-spec.md` — Actions Taken, Dashboard, authorization, conflict, and workflow API contract
- `docs/lab-04/ui-spec.md` — Actions Taken, Staff/Requester Dashboards, Administrator workspace, and responsive/accessibility contract
- `docs/lab-04/tests.md` — test plan, acceptance traceability, actual feature evidence, and release-final gates
- `docs/lab-04/reviewer.md` — peer-review history for Lab 4 PRs and final release-review record
- `docs/lab-04/ai-use.md` — actual selected prompts, assistance log, verification corrections, and student reflection
- `docs/lab-04/evidence.md` — Answer Part 1–9 evidence index and final PDF readiness map

## Git Workflow

- `main` — stable/released code
- `lab2-staging` — historical Lab 2 integration branch
- `lab3-staging` — Lab 3 integration/release-candidate branch
- `lab4-staging` — Lab 4 integration/release-candidate branch
- `feature/<issue>-...` — one feature branch per GitHub Issue

Lab 3 feature branches are peer-reviewed through PRs into `lab3-staging`. Issues #33–#39 and PRs #41–#47 contain the implemented Sprint 3 increment; Issue #40 performs its final evidence/release-readiness audit.

Lab 4 feature branches are peer-reviewed through PRs into `lab4-staging`. The implemented feature increments are tracked by Issues #50–#58 and PRs #60–#70. Issue #67 is the inserted Resolution Gate issue and is implemented by PR #68; PR numbers must not be mistaken for Issue numbers. Issue #59 performs the final evidence/release-readiness audit through PR #71, which is currently open for peer review. The final release is a separate reviewed PR from `lab4-staging` to `main`; it must not be merged until release evidence and exact-head CI/review gates are complete.

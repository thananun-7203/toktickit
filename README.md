# TokTickIT — IT Service Desk

TokTickIT is a full-stack IT service request application. Lab 2 delivers the requester-facing ticketing MVP: Development Requester selection, Create Ticket, My Tickets search/filter/sort/pagination, read-only Ticket Detail, attachment upload/download/soft removal with reason, requester ownership isolation, and the responsive Zen Green UI foundation.

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
│   └── tests/lab-02/
├── e2e/                            # Playwright Lab 2 flow
├── docs/lab-02/                    # spec, API/UI/test/review/AI evidence
├── artifacts/lab-02/screenshots/   # final visual evidence
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

## Development Requester Context

Lab 2 intentionally does **not** implement real authentication. On entry, select an active Development Requester from the dropdown. Ticket-scoped requests send the simulated identity through:

```text
X-Dev-Requester-Id: <requesterId>
```

This is for development/testing and requester-isolation evidence only. Staff/Admin workflows and real authentication are outside Lab 2 scope.

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

The Playwright configuration starts its own server on port `3001` and client on `5174`, but it expects PostgreSQL and SeaweedFS to already be available. By default it uses the Compose PostgreSQL database at port `5433`.

Run:

```bash
npm test
```

To target another clean E2E database, set `E2E_DATABASE_URL` before running Playwright. Example PowerShell:

```powershell
$env:E2E_DATABASE_URL="postgresql://toktickit:toktickit@127.0.0.1:5433/toktickit_issue6?schema=public"
npm test
```

## Lab 2 Documentation

- `docs/lab-02/specification.md` — scope, FR/BR/AC, decisions, data design
- `docs/lab-02/api-spec.md` — requester-ticket API contract
- `docs/lab-02/ui-spec.md` — Zen Green screens and responsive behavior
- `docs/lab-02/tests.md` — test plan, traceability, final regression record
- `docs/lab-02/reviewer.md` — peer-review history and PR evidence
- `docs/lab-02/ai-use.md` — LLM/model, selected prompts, assistance log, reflection
- `docs/lab-02/evidence.md` — final screenshot/API/review evidence index

## Git Workflow

- `main` — stable/released code
- `lab2-staging` — Lab 2 integration branch
- `feature/<issue>-...` — one feature branch per GitHub Issue

Each feature branch is peer-reviewed through a PR into `lab2-staging`. The final Lab 2 release is a separate reviewed PR from `lab2-staging` to `main` after the Issue 8 release-readiness audit is complete.

# Tok TickIT - IT Service Desk

A full-stack web application for managing IT service requests.

## Tech Stack
* **Frontend:** React, TypeScript, Vite, Bootstrap
* **Backend:** Node.js, Express, TypeScript
* **Database:** PostgreSQL, Prisma ORM
* **Testing:** Vitest, Supertest

## Prerequisites
* Node.js
* PostgreSQL (running locally, or a PostgreSQL container via Docker Desktop)
* Git and GitHub account

## Repository Structure
```text
toktickit/
├── client/                     # React frontend
├── server/                     # Express API + Prisma
│   ├── prisma/                 # Prisma schema and seed
│   ├── src/                    # API source code
│   └── tests/lab-01/          # Supertest API tests
├── docs/lab-01/               # Lab 1 documentation
├── .gitignore
└── README.md
```

## Project Setup Instructions

### 1. Backend Setup
Navigate to the server directory, install dependencies, and configure the database:
```bash
cd server
npm install
```

Create `server/.env` from the template and fill in your own database credentials:
```bash
copy .env.example .env
```

Example `DATABASE_URL`:
```bash
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>?schema=public"
```

Make sure PostgreSQL is running and the database exists, then apply migrations and seed the data:
```bash
npx prisma migrate dev
npx prisma db seed
```

Start the API:
```bash
npm run dev
```

The API will listen on `http://localhost:3000`.

### 2. Frontend Setup
In a second terminal, navigate to the client directory, install dependencies, and start the development server:
```bash
cd client
npm install
```

Create `client/.env` from the template if the API URL needs to be changed:
```bash
copy .env.example .env
```

Start the development server:
```bash
npm run dev
```

Open `http://localhost:5173`.

## Running Tests
Backend API tests (Supertest):
```bash
cd server
npm test
```

Frontend UI tests (Vitest):
```bash
cd client
npm test
```

## Git Workflow
- `main` — stable release
- `lab1-staging` — integration branch
- `feature/*` — one branch per GitHub Issue, merged into `lab1-staging` via PR after peer review
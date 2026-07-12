# AI Resume Analyzer

Production-grade AI resume analyzer (ATS scoring, skill matching, AI review) built with Next.js, Prisma, and Google Gemini.

## Stack

- **Next.js 15** (App Router) + React + TypeScript
- **Tailwind CSS v4** + **shadcn/ui**
- **SQLite** (local) / **PostgreSQL** (production) via Prisma
- **Zod**, React Hook Form, Zustand, TanStack Query
- **Vercel AI SDK** + Google Gemini (optional — rule-based fallbacks included)
- **Recharts**, next-themes, PDF.js, Mammoth, jsPDF

## Getting started

```bash
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env` if needed. Defaults:

- `DATABASE_URL="file:./dev.db"` (SQLite under `prisma/`)
- `GOOGLE_GENERATIVE_AI_API_KEY` — optional; without it the app uses heuristic parsers/scorers

## Scripts

| Script                | Description                   |
| --------------------- | ----------------------------- |
| `npm run dev`         | Start Next.js with Turbopack  |
| `npm run build`       | Production build              |
| `npm run start`       | Start production server       |
| `npm run lint`        | ESLint                        |
| `npm run format`      | Prettier write                |
| `npm run test`        | Vitest unit tests             |
| `npm run test:e2e`    | Playwright smoke (optional)   |
| `npm run db:generate` | Prisma client generate        |
| `npm run db:push`     | Push schema to the database   |
| `npm run db:seed`     | Seed a sample analyzed resume |
| `npm run db:studio`   | Open Prisma Studio            |

## Features

- Resume upload (PDF/DOCX)
- Text extraction + structured parsing
- ATS scoring with section breakdowns
- Job description matching
- AI / heuristic resume review
- Bullet rewrite before/after
- Skills + analytics dashboards
- Export JSON / Markdown / PDF

## Production (Vercel)

See [DEPLOY.md](./DEPLOY.md) for Postgres + Vercel steps.

> Note: SQLite is for local development only. Vercel serverless needs Postgres (Neon).

## Phase status

All planned phases are implemented locally:

1. Project setup
2. Database schema (SQLite locally)
3. Dashboard layout + dark mode
4. Resume upload
5. Resume parser
6. ATS score engine
7. Job description matching
8. AI / heuristic resume review
9. Bullet optimizer
10. Skills dashboard
11. Analytics dashboard
12. Export (JSON / Markdown / PDF)
13. Performance baselines
14. Unit tests + Playwright scaffold
15. Vercel deploy docs (`vercel.json`, `DEPLOY.md`)

## Deploying to Vercel

### Prerequisites

1. Neon (or other) **Postgres** connection string
2. Free **Gemini** API key from https://aistudio.google.com
3. Vercel account + CLI (`npm i -g vercel`) or GitHub integration

### Steps

1. Switch Prisma to Postgres in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Set Vercel environment variables:

- `DATABASE_URL` — Neon Postgres URL
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini key
- `NEXT_PUBLIC_APP_URL` — your production URL

3. Deploy:

```bash
npx vercel
```

4. After first deploy, run migrations against production:

```bash
npx prisma db push
```

(or add a migrate workflow once you adopt `prisma migrate`)

### Notes

- Local development uses **SQLite** (`file:./dev.db`).
- Vercel serverless **cannot** use local SQLite — use Neon Postgres in production.
- Uploaded files are stored under `/uploads` on disk locally; for multi-instance production, move storage to Vercel Blob / S3.

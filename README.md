# Privora AI

Privora AI is a React, Vite, Tailwind, and Supabase privacy-operations platform for Indian DPDP workflows.

## Features
- Premium SaaS dashboard layout
- Consent management, rights requests, breach response, AI privacy notice, checklist, data inventory, audit timeline, reports, settings
- Local sample data and simulated AI responses
- Fully client-side; no backend or OpenAI API required

## Run locally
```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

## GitHub setup
1. Create a new GitHub repository.
2. In this folder, run:
```bash
git init
git add .
git commit -m "Initial Privora AI platform"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

## Vercel deployment
1. Log in to Vercel and import the GitHub repository.
2. Set build command to:
```bash
npm run build
```
3. Set output directory to:
```bash
dist
```
4. Add any environment variables in Vercel if you need API keys later.

## Production release

1. Set only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel. Never add service-role or provider secrets to Vercel browser variables.
2. Apply the SQL files in `src/data/migrations` in numeric order through the Supabase SQL editor or CLI, including migrations `013` and `014`.
3. Deploy Edge Functions with `supabase functions deploy create-upload finalize-upload ai-copilot compliance-reminders` and set the values in `supabase/functions/.env.example` with `supabase secrets set`.
4. Schedule `compliance-reminders` daily from Supabase Cron (or an external scheduler) with `Authorization: Bearer <CRON_SECRET>`.
5. Set Supabase Auth redirect URLs to the deployed Vercel domain, then run `node scripts/verify-live.mjs`, `npm test`, and `npm run build`.

## Notes
- Keep secret API credentials out of source control.
- Use `.env` locally for development values and configure Vercel env vars for production.

## Architecture

- React routes and reusable enterprise UI live in `src/pages` and `src/components`.
- `src/utils/dbStoreReal.js` is the browser data-access boundary; it scopes all workspace reads and mutations to the active organisation.
- Supabase Auth provides sessions. PostgreSQL migrations in `src/data/migrations` enforce RBAC, RLS, tenant isolation, foreign-key integrity, and audit triggers.
- Apply migrations in numeric order (including `013_harden_support_access.sql`), then run `npm test` and `npm run build` before deployment.

## API / data access

The browser does not access service-role credentials. Use `dbStore` methods for application data rather than direct table calls. External integrations (AI, email, scanners, file ingestion, payment) must run in server-side endpoints or Supabase Edge Functions and use secrets stored outside the client bundle. The Support Center is available at `/support`; configure a server-side notification workflow for new tickets before launch.

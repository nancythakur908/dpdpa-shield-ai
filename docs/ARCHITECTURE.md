# Privora AI architecture

Privora AI is a client application backed by Supabase Auth and PostgreSQL.

## Request flow

1. Supabase Auth establishes the browser session.
2. `resolveCurrentOrganisationId` selects the active tenant from an authenticated membership.
3. React pages use `dbStore`, not direct database calls.
4. Supabase RLS and role helper functions enforce tenant isolation and mutation permissions.
5. Database triggers create tamper-evident audit evidence for protected operational tables.

## Production boundaries

The browser only receives the Supabase publishable key. AI generation, email delivery, file/database scanning, cookie-script delivery, payment, scheduled escalation, and privileged administration belong in Edge Functions or another server-side service. Secrets must never be exposed through `VITE_*` variables.

## Release checks

Apply migrations in numerical order, configure Supabase Auth redirect URLs and CSP at the deployment edge, then run `npm test` and `npm run build`.

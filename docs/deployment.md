# Deploying to Vercel

The app runs on Vercel (region `fra1`, Frankfurt) with a managed Postgres
database and an S3-compatible bucket, all in the EU. Every push to `main`
deploys production; every other branch and pull request gets a preview URL.

## How a deploy works

1. GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull
   request: migrations against a throwaway Postgres, a schema drift check,
   lint, typecheck, unit tests and a full build.
2. Vercel builds with `npm run vercel-build` (set in `vercel.json`):
   `prisma migrate deploy && next build`. Migrations are applied to the
   environment's own database before the new code goes live. If the build
   fails, the previous version keeps running.
3. Cron jobs in `vercel.json` call `/api/cron/*`. Vercel sends
   `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is
   set. The 5- and 15-minute schedules need a **Pro** plan (Hobby allows
   daily jobs only).

Rollback: Vercel dashboard → Deployments → a previous deployment →
**Promote to Production**. Code rolls back instantly; the database does not,
so migrations must stay backwards compatible (add columns first, remove them
in a later release).

## One-time setup

### 1. Database (EU, managed)

Use Neon, Supabase or similar in an EU region (Frankfurt). Create **two**
databases or branches: one for Production and one for Preview, so testing a
pull request can never touch real client data.

Turn on automatic backups and point-in-time restore.

Each provider gives two connection strings:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Pooled connection string (PgBouncer / pooler) |
| `DIRECT_URL` | Direct connection string (used only by migrations) |
| `DATABASE_POOL_MAX` | `3` (each serverless instance opens its own small pool) |

After the first deploy has applied the migrations, load the reference data
and create the first admin from your machine, pointing at the production
database:

```sh
DATABASE_URL="<direct url>" npm run db:setup
DATABASE_URL="<direct url>" npm run db:create-admin -- admin@yourdomain.gr "Full Name"
```

The admin signs in with an email link and must set up two-factor
authentication. **Never** run `prisma db seed` against production: it
creates demo accounts, and it refuses to run when `NODE_ENV=production`.

### 2. File storage (EU bucket)

Create a **private** bucket, for example Cloudflare R2 with EU jurisdiction,
or AWS S3 in `eu-central-1`. Create an access key limited to that bucket.

| Variable | R2 example | S3 example |
|---|---|---|
| `S3_ENDPOINT` | `https://<account-id>.eu.r2.cloudflarestorage.com` | `https://s3.eu-central-1.amazonaws.com` |
| `S3_REGION` | `auto` | `eu-central-1` |
| `S3_BUCKET` | bucket name | bucket name |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | from the API token | from the IAM user |

Browsers upload directly to the bucket (Vercel limits request bodies to
4.5 MB), so the bucket needs a CORS rule:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.gr"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Add the preview domain (`https://*-<team>.vercel.app`) to a separate
Preview bucket instead of the production one.

How files flow (`src/lib/storage.ts`):

- **Upload.** The app checks the declared type and size and returns a signed
  PUT URL that is valid for 10 minutes. The browser uploads the file, and the
  form sends back a signed ticket. The server then reads the object's real
  size and first bytes, and deletes anything invalid.
- **Download.** Download routes check permissions (and log document views),
  then redirect to a signed GET link: 1 minute for verification documents,
  1 hour for photos.

### 3. Environment variables on Vercel

Set these under Project → Settings → Environment Variables. Unless noted,
use **different values for Production and Preview**.

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.gr` (Preview: leave unset or the preview domain) |
| `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `EMAIL_FROM` | Final brand |
| `DATA_ENCRYPTION_KEY` | New 32-byte key **for production only**. Store a copy in a password manager: data encrypted with a lost key cannot be recovered |
| `CRON_SECRET` | Long random string |
| `TWO_FACTOR_ENFORCE` | `true` |
| `DATABASE_URL`, `DIRECT_URL`, `DATABASE_POOL_MAX` | See above |
| `S3_*` | See above |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET` | Live keys in Production, test keys in Preview. Webhook URL: `https://yourdomain.gr/api/webhooks/stripe` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Add `https://yourdomain.gr/api/auth/google/callback` as a redirect URI |
| `RESEND_API_KEY` | Verify the sending domain (SPF, DKIM, DMARC) first |
| `TWILIO_*` | Optional SMS reminders |
| `DAILY_API_KEY` | Recommended: reliable video with TURN relays |
| `MYDATA_*` | Test against AADE's test environment (`MYDATA_ENV`) before going live |

Generate random secrets with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Domain and checks

1. Add the domain in Vercel and point DNS at it. HTTPS is automatic. HSTS
   is already sent.
2. Point an uptime monitor (Better Stack, UptimeRobot...) at `/api/health`.
   It returns 200 when the database is reachable and 503 when it isn't.
3. Enable the Vercel GitHub integration's required check: protect `main` so
   it only merges when **CI** passes.

## Before real users

- Error tracking (e.g. Sentry with EU data residency).
- Lawyer review of the legal templates; Data Protection Impact Assessment.
- Replace "BRAND NAME".

# Free deployment (test / demo site)

A complete, working copy of the site on free plans, all in the EU. Good for
testing, demos and showing psychologists. Plan about an hour. For the
production setup (paid plans, own domain, separate preview data), see
[deployment.md](deployment.md).

| Piece | Service (free plan) | Notes |
|---|---|---|
| Website | Vercel Hobby | `https://<project>.vercel.app`, Frankfurt region |
| Database | Neon Free | Postgres in Frankfurt; sleeps when idle (first request after a pause takes a second longer) |
| Files | Cloudflare R2 | Free allowance of 10 GB; Cloudflare asks for a payment card to turn R2 on, but you aren't charged within the allowance |
| Scheduled jobs | cron-job.org | Calls the reminder and calendar jobs every few minutes |
| Email | none at first | Without an email provider, emails (sign-in links, password resets) are written to the Vercel logs instead of being sent |

**Before real users:** Vercel's terms limit Hobby to personal, non-commercial
use (check the current terms), the free database has no long backups, and
emails aren't really sent. Move to the setup in deployment.md before taking
real bookings or payments.

## 1. Database: Neon

1. Sign up at neon.tech (signing in with GitHub is fine).
2. **Create project**: Postgres 17, region **AWS Europe Central 1 (Frankfurt)**.
3. On the project dashboard, **Connect** shows the connection string. Copy two
   versions and keep them in your password manager:
   - **Pooled** (the host contains `-pooler`): this becomes `DATABASE_URL`.
   - **Direct** (turn "Connection pooling" off): this becomes `DIRECT_URL`.
4. **Branches → Create branch** named `preview` (from `main`), and copy its
   pooled and direct strings too. Preview sites for pull requests use this
   branch, so testing a change can never alter the main site's data.

## 2. File storage: Cloudflare R2

1. Sign up at cloudflare.com, open **R2 Object Storage** and turn it on.
2. **Create bucket**: name e.g. `psy-files`. Under **Location**, choose
   **Specify jurisdiction → European Union**.
3. Bucket → **Settings → CORS policy → Add**, and paste the following. Replace
   the address after the first deploy (step 3) if your project name differs:

   ```json
   [
     {
       "AllowedOrigins": ["https://<project>.vercel.app"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

4. R2 overview → **Manage API tokens → Create API token**: permission
   **Object Read & Write**, limited to this bucket. Copy the **Access Key ID**
   and **Secret Access Key** (shown once).
5. Note the **S3 endpoint** for EU buckets:
   `https://<account-id>.eu.r2.cloudflarestorage.com` (shown on the bucket's
   settings page).

## 3. Website: Vercel

1. Sign up at vercel.com **with GitHub** (Hobby plan).
2. **Add New → Project** → import `psychologist-marketplace`. The settings
   are read from `vercel.json` (build command, Frankfurt region), so change
   nothing there.
3. Before clicking Deploy, open **Environment Variables** and add the values
   below for **Production** and **Preview**. The only difference: Production
   gets the Neon `main` strings, and Preview gets the `preview` branch
   strings.

   Create the two secrets on your own computer and paste them straight into
   Vercel, then keep a copy of `DATA_ENCRYPTION_KEY` in your password manager.
   Data encrypted with a lost key can't be recovered. Run this once for each
   secret:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** string |
   | `DIRECT_URL` | Neon **direct** string |
   | `DATABASE_POOL_MAX` | `3` |
   | `DATA_ENCRYPTION_KEY` | first generated secret |
   | `CRON_SECRET` | second generated secret |
   | `TWO_FACTOR_ENFORCE` | `true` |
   | `S3_ENDPOINT` | the R2 EU endpoint |
   | `S3_REGION` | `auto` |
   | `S3_BUCKET` | your bucket name |
   | `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | from the R2 token |

   You don't need `NEXT_PUBLIC_SITE_URL`: on Vercel the site uses its
   production address automatically. Set it later if you add your own domain.

4. Click **Deploy**. The first build creates the database tables, which takes
   about 3–4 minutes. When it finishes, note the address
   (`https://<project>.vercel.app`) and fix the R2 CORS rule if it differs.

## 4. Load the starting data

Run these on your computer from the project folder. They point the scripts
at Neon for this terminal window only; your local `.env` stays untouched.
Use the **direct** string.

```powershell
$env:DATABASE_URL = "<Neon direct string>"; $env:DIRECT_URL = $env:DATABASE_URL
```

Then choose **one** of the following.

**A. Empty site (closest to launch):** reference data plus your admin account.

```powershell
npm run db:setup
```

```powershell
npm run db:create-admin -- you@yourdomain.gr "Your Name"
```

**B. Demo site with sample psychologists, bookings and messages.** The demo
data is encrypted, so the key must be the same one you gave Vercel. Use a
strong demo password: this site is public.

```powershell
$env:DATA_ENCRYPTION_KEY = "<same key as on Vercel>"; $env:SEED_PASSWORD = "<long demo password>"; $env:SEED_ADMIN_EMAIL = "you@yourdomain.gr"
```

```powershell
npx prisma db seed
```

Close the terminal afterwards so the values don't linger.

**Signing in:** go to `/en/sign-in`. Choose "Email me a sign-in link
instead", or use the demo password. While no email provider is set up, find
the link in Vercel → your project → **Logs** (search for `email:dev`). Admins
and psychologists then set up two-step sign-in with an authenticator app.

## 5. Scheduled jobs: cron-job.org

1. Sign up at cron-job.org (free).
2. Create two cron jobs:

   | Title | URL | Schedule |
   |---|---|---|
   | Notifications | `https://<project>.vercel.app/api/cron/notifications` | every 5 minutes |
   | Calendars | `https://<project>.vercel.app/api/cron/calendars` | every 15 minutes |

3. In each job, under **Advanced → Headers**, add
   `Authorization` = `Bearer <your CRON_SECRET>`.
4. Use **Test run**: the response should be `200` with a short JSON summary.
   `401` means the header doesn't match `CRON_SECRET`.

The daily cleanup job runs from Vercel itself (`vercel.json`).

## 6. Check it works

- `https://<project>.vercel.app/api/health` returns `{"ok":true}`.
- Search, profiles and the booking form load in Greek and English.
- As a psychologist, upload a licence in onboarding. This checks R2 and CORS:
  the file should show as uploaded, and open from the review page.

## Optional free add-ons

- **Real emails:** Resend (free tier). Until you verify a domain you own, it
  only delivers to your own address. Add `RESEND_API_KEY` and `EMAIL_FROM`.
- **Card payments in test mode:** Stripe test keys (`sk_test_…`) plus a
  webhook to `https://<project>.vercel.app/api/webhooks/stripe`. No real money
  moves.
- **Reliable video:** Daily.co free tier. Add `DAILY_API_KEY`.
- **Sign in with Google:** an OAuth client in Google Cloud with the redirect
  URI `https://<project>.vercel.app/api/auth/google/callback`.

## Updating the site

Push to `main`. GitHub Actions runs the checks, and Vercel builds and
deploys: database changes are applied first, then the new version goes
live. If a build fails, the previous version keeps running.

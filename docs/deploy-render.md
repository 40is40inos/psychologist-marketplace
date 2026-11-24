# Public demo on Render (free)

A live, shareable demo for pitches, curious visitors and recruiters. It
runs on fictional sample data, and visitors try it with **one click** as a
client, a psychologist or an admin, with no sign-up, passwords or emails.
Setup takes about 15 minutes, and two values are copied by hand.

**What's different from a real site (`DEMO_MODE=true`, set in `render.yaml`):**

- A banner on every page says the data is fictional and offers the three
  one-click sign-ins. `/en/demo` (or `/el/demo`) explains the product and
  what to try.
- Demo accounts can't change their password, email, two-step sign-in or
  devices, and can't be deleted or suspended. That way the next visitor
  can always use them. Two-step sign-in isn't required in the demo.
- Search engines are told not to index anything (`robots.txt` and an
  `X-Robots-Tag` header), so fictional psychologists never show up as real
  results.
- No emails, SMS or payments are sent. Without those services set up,
  emails go to the server log. Booking uses "pay at the session".
- Uploaded files are kept on the server's temporary disk and disappear when
  the site restarts or sleeps. That's fine for a demo; the sample data
  doesn't depend on them.

Never turn on demo mode for a site with real users: one click gives admin
access. As an extra safeguard, one-click sign-in only works for reserved
`*.test` addresses.

## 1. Database: Neon (free, permanent)

Render's own free database is deleted 30 days after it's created, so the
demo uses Neon instead.

1. Sign up at neon.tech (signing in with GitHub is fine).
2. **Create project**: Postgres 17, region **AWS Europe Central 1 (Frankfurt)**.
3. Click **Connect**, turn **Connection pooling off**, and copy the connection
   string (`postgresql://…neon.tech/neondb?sslmode=require`). Keep it in your
   password manager.

## 2. Website: Render Blueprint

1. Sign up at render.com with **GitHub**, and allow access to the
   `psychologist-marketplace` repository.
2. **New → Blueprint** → pick the repository. Render reads `render.yaml`
   and shows one free web service in Frankfurt.
3. It asks for three values:

   | Name | What to enter |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `NEXT_PUBLIC_BRAND_NAME` | the product name to show (e.g. a working name) |
   | `DEMO_SOURCE_URL` | optional: your GitHub repository's address, shown as "View the source code" on the demo guide; leave empty to hide it |

   Render creates the encryption key, cron secret and demo password itself.
   Nobody copies those.
4. Click **Apply**. The first deploy takes about 5–10 minutes: it creates the
   database tables, loads the demo data, then builds the site.
5. Open the address Render shows, usually
   `https://psychologist-marketplace-demo.onrender.com`, and add `/en/demo`.
   That's the link to share.

## 3. Optional: keep it awake

Free Render sites go to sleep after 15 minutes without visitors, and the
next visitor waits about a minute. If you're about to share the link (a
pitch, an application), open it yourself a minute before.

To keep it awake all the time, create a free job at cron-job.org that opens
`https://<your-site>.onrender.com/api/ping` every 10 minutes. That endpoint
doesn't touch the database, so Neon can still sleep. Running all month uses
about 744 of Render's 750 free hours, which works for this one service only.

## Everyday use

- **Updating:** every push to `main` redeploys automatically, after the same
  steps (tables, demo data, build).
- **Tidying the demo:** **Manual Deploy → Deploy latest commit** loads the
  demo data again and puts the demo accounts back in order. Bookings,
  messages and sign-ups that visitors made stay; to start completely fresh,
  reset the Neon database (Neon → Branches → `main` → Reset) and deploy again.
- **Logs:** Render → the service → **Logs**, including the emails the demo
  would have sent.

## If something goes wrong

- **Build stops with "out of memory":** the free instance is small. Retry
  once (Manual Deploy). If it keeps happening, the build has to run on a paid
  instance type for that deploy, or the site moves to Vercel
  (see [deploy-free.md](deploy-free.md)).
- **"Refusing to seed in production":** `DEMO_MODE` isn't `true`; check the
  service's Environment tab.
- **Database errors during build:** check that `DATABASE_URL` is Neon's
  **direct** (non-pooled) string and ends with `sslmode=require`.

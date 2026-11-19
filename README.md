# BRAND NAME — psychologist marketplace

Find, compare and book sessions with licensed psychologists and
psychotherapists. Launch market: Greece. Languages: Greek (default) and English.

## Stack
Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 ·
Prisma 7 + PostgreSQL · Leaflet maps · lucide-react icons.

## Getting started
```bash
cp .env.example .env      # set DATABASE_URL, DATA_ENCRYPTION_KEY, CRON_SECRET
npm install
npm run dev               # http://localhost:3000 -> redirects to /el or /en
```

### Database
No local Postgres? Prisma's built-in dev server works:
```bash
npx prisma dev --name psy --detach   # prints a postgres:// URL -> put it in DATABASE_URL
npx prisma migrate deploy            # apply migrations
npx prisma db seed                   # demo data + test accounts
```
With `prisma dev`, set `DATABASE_POOL_MAX=1` and `BUILD_CPUS=1` in `.env`: it
handles very few connections and can crash under a parallel build.

To create a new migration without a shadow database (needed with `prisma dev`):
```bash
git show HEAD:prisma/schema.prisma > /tmp/old.prisma
npx prisma migrate diff --from-schema /tmp/old.prisma --to-schema prisma/schema.prisma --script -o prisma/migrations/<timestamp>_<name>/migration.sql
npx prisma migrate deploy && npx prisma generate
```

Seed accounts all use `SEED_PASSWORD` from `.env`:
`admin@example.test` (admin), `client@example.test` (client),
`psychologist1@example.test` (verified psychologist),
`applicant1@example.test` (psychologist awaiting verification).

## Section 1 — market and basics
| Concern | Where |
|---|---|
| Brand name placeholder (env `NEXT_PUBLIC_BRAND_NAME`) | `src/config/brand.ts` |
| Markets (GR now; add EU countries here), time zone, crisis lines | `src/config/market.ts` |
| Locales, Intl tags, default locale | `src/i18n/config.ts` |
| Dictionaries (`en.ts` defines the shape; `el.ts` must match or the type check fails) | `src/i18n/dictionaries/` |
| Locale routing: `/el/...`, `/en/...`; cookie → Accept-Language → Greek | `src/proxy.ts` |
| EUR formatting from integer cents, dates/times in Europe/Athens | `src/lib/format.ts`, `src/lib/time.ts` |
| Session types: `in_person`, `video`, `phone` | `src/domain/session-types.ts` |

## Section 2 — user roles
| Role | Area | Can do |
|---|---|---|
| Client | `/[lang]/account` | Appointments, messages, saved, receipts, reminder settings |
| Psychologist | `/[lang]/dashboard` | Verification status, prices and intro-call toggle, bilingual profile, sessions, clients, messages |
| Admin | `/[lang]/admin` | Analytics, license verification, user suspension, disputes; all actions audited |

- Permissions: `src/domain/roles.ts` (`can(role, permission)`).
- Auth: scrypt hashes, hashed session tokens in `AuthSession`, httpOnly cookie,
  rate-limited sign-in (in-memory; use Redis with more than one server).
- Admins are created by the seed only. Psychologists stay out of search until verified.

## Section 3 — client features
| Feature | Where |
|---|---|
| Home search: concern, city or online, language, date | `src/components/search-form.tsx` |
| Results with filters (concerns, approach, client type, format, price, language, gender, earliest availability), sort, map view | `src/app/[lang]/psychologists/page.tsx`, `src/lib/search.ts` |
| Shared taxonomy (labels in dictionaries) | `src/domain/taxonomy.ts` |
| "Help me choose": 8 questions → 3–5 matches with reasons | `src/app/[lang]/match/`, `src/lib/matching.ts` |
| Profile: video (click-to-load), bio, education, license, approaches, prices, office map, cancellation policy, live calendar, FAQ | `src/app/[lang]/psychologists/[slug]/page.tsx` |
| Availability engine (weekly hours, time off, bookings, notice, buffer, DST-safe) | `src/lib/availability.ts` |
| Booking: format → slot → intake → reserve → confirmation; double-booking prevented with a per-psychologist advisory lock | `src/app/[lang]/psychologists/[slug]/book/`, `src/lib/booking.ts` |
| Free 15-minute intro call (psychologist toggle, one per client) | booking + dashboard prices form |
| Reschedule / cancel within the psychologist's policy (late cancellations flagged) | `src/app/[lang]/account/appointments/[id]/` |
| Receipts (printable), saved psychologists, reminder settings | `src/app/[lang]/account/*` |
| Messaging, AES-256-GCM encrypted at rest, only after a booking | `src/lib/messaging.ts`, `src/lib/crypto.ts` |
| Email + SMS: confirmation, 24h and 1h reminders, cancellations, `.ics` attached | `src/lib/notifications/`, `/api/cron/notifications` |
| Calendar download | `/api/appointments/[id]/ics` |
| Private post-session feedback (public only with explicit opt-in) | `Feedback` model, appointment page |

## Section 4 — psychologist workspace (`/[lang]/dashboard`)
| Feature | Where |
|---|---|
| Onboarding wizard (personal, license + ID upload, education, specialties, photo/bio/video, prices, office, IBAN/ΑΦΜ, submit) | `dashboard/profile`, `src/actions/onboarding.ts` |
| Private file storage (content-sniffed uploads; documents only for owner/admin) | `src/lib/storage.ts`, `/api/documents/[id]`, `/api/photos/[id]` |
| Weekly hours per format, buffer, notice, booking window, time off, manual approval | `dashboard/calendar`, `src/lib/availability.ts` |
| Calendar sync: import busy times from Google/Outlook secret iCal links; export feed | `src/lib/calendar-sync.ts`, `/api/calendar/[token]`, `/api/cron/calendars` |
| Appointments: accept/decline, reschedule, cancel, no-show, completed, mark paid | `dashboard/appointments`, `src/lib/booking-psychologist.ts` |
| Video sessions: Daily.co when `DAILY_API_KEY` is set, otherwise built-in WebRTC (add TURN for production) | `/[lang]/session/[id]`, `src/lib/video.ts` |
| Client list and encrypted private notes (psychologist only) | `dashboard/clients` |
| Payments, receipts (Απόδειξη Παροχής Υπηρεσιών) and myDATA transmission with the psychologist's own credentials | `dashboard/payments`, `src/lib/invoicing.ts`, `src/lib/mydata.ts` |
| Profile analytics (views, search appearances, booking starts, bookings) | `dashboard/analytics`, `src/lib/analytics.ts` |
| Configurable plans (price, commission, features) | `dashboard/plan`, `/admin/plans`, `src/lib/plans.ts` |

myDATA: confirm the VAT exemption and income classification codes with an accountant
(`MYDATA_*` env vars); set `MYDATA_ENV=production` for the live endpoint.

## Section 5 — admin panel (`/[lang]/admin`)
| Feature | Where |
|---|---|
| License verification with documents | `admin/verifications` |
| Users and psychologists, suspension | `admin/users` |
| Bookings and payments, refunds (audited), disputes | `admin/bookings`, `admin/disputes` |
| Review moderation (only consented + approved feedback is public, anonymous) | `admin/reviews` |
| Editable taxonomy and session languages (database-driven, cached) | `admin/taxonomy`, `src/lib/taxonomy-data.ts` |
| CMS for blog articles and static pages (safe Markdown) | `admin/content`, `/[lang]/blog`, `/[lang]/p/[slug]` |
| Analytics: signups, bookings, revenue, refunds, top searches, no-result searches | `admin/analytics`, `SearchLog` |

The seeded privacy/terms/cookies pages are templates and must be reviewed by legal counsel.

### Running reminders
Call the cron endpoint every 5 minutes (Vercel Cron, GitHub Actions, or cron + curl):
```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/notifications
```
Without `RESEND_API_KEY` / `TWILIO_*` the messages are written to the server log.

### Not yet
- Online card payment: bookings are "reserve, pay at session". The `Payment`
  model and method field are ready for a provider.
- Psychologist-side calendar editing (weekly hours, time off) — seeded for now.
- Video session links, email verification, password reset.
- Map tiles use OpenStreetMap's public server; set `NEXT_PUBLIC_MAP_TILE_URL`
  to a commercial tile provider before launch.
- Official receipts (AADE myDATA) are issued by the psychologist, not the platform.

## Conventions
- Money is integer cents + currency; timestamps are UTC; display uses Europe/Athens.
- Greek names are transliterated (ELOT 743) on non-Greek pages: `src/lib/slug.ts`.

### Adding a language
1. Add the code to `locales` in `src/i18n/config.ts`.
2. Add `src/i18n/dictionaries/<code>.ts` typed as `Dictionary`.
3. Add the value to the `Locale` enum in `prisma/schema.prisma`.

### Adding a country
Add an entry to `markets` in `src/config/market.ts` with **verified** crisis
line numbers, and a `Country` row in the database.

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

## Section 6 — mental-health safeguards
| Requirement | How |
|---|---|
| Crisis safety | "Need urgent help?" link in the header of every page → `/[lang]/urgent-help` (static, tap-to-call 112 / 1018 / 10306); crisis notice in the footer and the booking flow; "not an emergency service" stated everywhere |
| Risk signals | `src/lib/risk.ts` (Greek + English, accent-insensitive) flags intake text live and on save; optional safety question in "Help me choose" (answer never stored). Crisis resources appear immediately; psychologists see a risk note on the booking |
| Reviews policy | Feedback is private by default (`src/config/policy.ts`, `PUBLIC_TESTIMONIALS=false`). Psychologists see it without client names; profiles show only aggregated indicators (reply time, % held as scheduled) above minimum sample sizes |
| Discretion | Neutral email subjects and bodies (no names, therapy words or session types), neutral calendar titles, optional "no platform name" in SMS, neutral card-statement descriptor (`PAYMENT_STATEMENT_DESCRIPTOR`) |
| Accessibility | WCAG 2.1 AA: AA contrast on all colour tokens (light + dark), labelled controls, skip link, `lang` per page and per text block, logical headings, 320px reflow, reduced-motion support |

Pick a brand name and card-statement descriptor that don't reveal the service ("psych", "therapy").

### Running reminders
Call the cron endpoint every 5 minutes (Vercel Cron, GitHub Actions, or cron + curl):
```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/notifications
```
Without `RESEND_API_KEY` / `TWILIO_*` the messages are written to the server log.

### Not yet
- Email verification and password reset.
- Map tiles use OpenStreetMap's public server; set `NEXT_PUBLIC_MAP_TILE_URL`
  to a commercial (EU-hosted) tile provider before launch.
- Payouts to psychologists from card payments (Stripe Connect or manual bank
  transfers) are not automated yet.

## Section 7 — compliance and security
| Requirement | How |
|---|---|
| GDPR consent | Separate, explicit Art. 9 health-data consent at client sign-up; every consent stored as a versioned `ConsentRecord` (`LEGAL_VERSION` in `src/config/legal.ts`). Withdrawing it blocks booking and messaging. Manage in *Account → Privacy* (psychologists/admins: *Security*) |
| Minimisation | Hourly `/api/cron/retention` deletes expired sessions, video signalling (1 day), search logs (13 months), notification logs (12 months) and releases unpaid card holds |
| Export / deletion | `/api/account/export` (JSON, decrypted); self-service deletion anonymises the account and deletes messages, intake answers, feedback text and saved items; receipts kept without the name, as tax law requires |
| Cookie banner | Essential cookies only by default; maps/videos load only after "Allow" (equal-weight buttons, changeable later). Third-party map tiles are click-to-load without consent |
| Privacy policy | DPA-ready template (`prisma/seed-legal.ts`): controller vs processor roles, Art. 6/9 legal bases, EU processors table, transfers, retention table, rights, HDPA complaint route |
| EU data residency | Deploy app, database and file storage in an EU region (e.g. Frankfurt); Stripe Payments Europe (Ireland); choose EU regions for email/SMS/video. Fill in the processors table in the privacy policy |
| Encryption | AES-256-GCM at rest for session notes, intake answers, messages, tax IDs, IBANs, myDATA credentials and TOTP secrets (`DATA_ENCRYPTION_KEY`); HSTS + TLS everywhere; strict security headers and CSP (`next.config.ts`) |
| Access control | Role permissions in `src/domain/roles.ts`; append-only audit log of views of client records, intake answers, documents, exports, deletions and 2FA changes (`/[lang]/admin/audit`) |
| 2FA | TOTP (RFC 6238) with QR setup and 10 one-time recovery codes; **mandatory** for psychologists and admins (`TWO_FACTOR_ENFORCE`), optional for clients |
| Payments | Stripe Checkout (hosted page, PCI SAQ A, SCA/3-D Secure): card data never touches our servers. Slot held 30 min while paying; approval-required bookings authorise and capture on accept, release on decline; refunds (client cancellation minus late fee, psychologist cancellation, admin) go back to the card. Webhook `/api/webhooks/stripe` verifies signatures and is idempotent |
| Terms | Client terms, psychologist terms with an Art. 28 data-processing agreement, cancellation/refund policy, cookie policy, linked at sign-up and in the footer |

All legal pages are **templates for legal review**. The seed refreshes a legal
page only while it still begins with the template note, so CMS edits survive.

### Enabling card payments
1. Set `STRIPE_SECRET_KEY` (test key first) and `PAYMENT_STATEMENT_DESCRIPTOR`.
2. Add a webhook endpoint for `https://your-domain/api/webhooks/stripe` with
   `checkout.session.completed`, `checkout.session.expired`,
   `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`;
   put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

Without a key, clients pay at the session and the card option is hidden.

### Running retention
```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/retention
```

## Section 8 — design direction
| Brief | How |
|---|---|
| Calm, warm, human | Soft warm neutrals (`--bg #faf8f4`), generous spacing, rounded-3xl cards with soft shadows; no clinical blues or hard edges |
| One gentle accent | Sage `--primary #466b58` (6:1 with white, 5:1+ on every background). The muted clay `--accent` is only for attention states (warnings, late cancellation, destructive actions). Tokens in `src/app/globals.css`, mirrored for dark mode |
| Friendly sans, large text | Commissioner (Latin + Greek) for body and headings; root size 106.25% (17px by default, still follows browser settings), line-height 1.6 |
| Real photography | Larger, softly rounded portrait slots (`src/components/avatar.tsx`); photo guidance in the psychologist profile editor. Psychologists upload their own photos. The demo seed uses initials, so no stock photos of people pretend to be therapists |
| Soft illustrations | Token-coloured line illustrations for empty states (`src/components/ui/illustrations.tsx`), wired into the shared `EmptyState` |
| Reassuring microcopy | e.g. "It's okay not to know where to start" on the home page, gentle empty-state and no-results copy, in Greek and English |
| Trust signals | Verified badge plus licence number on every card and profile, "We checked this licence" note, "No booking fees or hidden costs" on cards, profiles and the booking summary |

## Section 9 — pages
Every route is under `/el/…` and `/en/…`.

| Page | Route |
|---|---|
| Home | `/` |
| Search results (filters, list/map) | `/psychologists` |
| Psychologist profile | `/psychologists/[slug]` |
| Matching questionnaire | `/match`, `/match/results` |
| Booking flow | `/psychologists/[slug]/book` → `/account/appointments/[id]` |
| Client dashboard | `/account` (appointments, messages, saved, receipts, settings, privacy) |
| Psychologist dashboard | `/dashboard` (calendar, appointments, clients, payments, profile, analytics, plan, feedback, messages) |
| Video session room | `/session/[id]` |
| Admin panel | `/admin` |
| For psychologists (benefits, plans from the database, sign-up) | `/for-psychologists` |
| Blog / articles | `/blog`, `/blog/[slug]` |
| Concern pages (SEO) | `/anxiety`, `/depression`, … (every active concern with at least one public profile) |
| City pages (SEO) | `/psychologists-athens`, `/psychologists-thessaloniki`, … |
| About, Privacy, Terms, Cookies, Cancellation, Terms for psychologists | `/p/[slug]` (CMS) |
| FAQ | `/faq` |
| Contact (rate-limited form, emailed to support, nothing stored) | `/contact` |
| Crisis resources | `/urgent-help` |

Concern and city pages show live listings, price and online stats, internal
links and an FAQ with `FAQPage` + `BreadcrumbList` structured data. Optional
editorial copy comes from CMS pages named `concern-<slug>` / `city-<slug>`
(see the seeded `concern-anxiety`). `/sitemap.xml` lists all public pages with
hreflang alternates; `/robots.txt` keeps private areas out of search.

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

# BRAND NAME — psychologist marketplace

Find, compare and book sessions with licensed psychologists and
psychotherapists. Launch market: Greece. Languages: Greek (default) and English.

## Stack
Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 ·
Prisma 7 + PostgreSQL · lucide-react icons.

## Getting started
```bash
cp .env.example .env      # set DATABASE_URL and NEXT_PUBLIC_BRAND_NAME
npm install
npm run dev               # http://localhost:3000 -> redirects to /el or /en
```
### Database
No local Postgres? Prisma's built-in dev server works:
```bash
npx prisma dev --name psy --detach   # prints a postgres:// URL -> put it in DATABASE_URL
npm run db:migrate                   # apply migrations
npx prisma db seed                   # demo data + test accounts
```
Seed accounts all use `SEED_PASSWORD` from `.env`:
`admin@example.test` (admin), `client@example.test` (client),
`psychologist1@example.test` (verified psychologist),
`applicant1@example.test` (psychologist awaiting verification).

## Section 1 — what's in place
| Concern | Where |
|---|---|
| Brand name placeholder (env `NEXT_PUBLIC_BRAND_NAME`) | `src/config/brand.ts` |
| Markets (GR now; add EU countries here), time zone, crisis lines | `src/config/market.ts` |
| Locales, Intl tags, default locale | `src/i18n/config.ts` |
| Dictionaries (`en.ts` defines the shape; `el.ts` must match or the type check fails) | `src/i18n/dictionaries/` |
| Locale routing: `/el/...`, `/en/...`; cookie → Accept-Language → Greek | `src/proxy.ts` |
| EUR formatting from integer cents, dates/times in Europe/Athens | `src/lib/format.ts` |
| Session types: `in_person`, `video`, `phone` | `src/domain/session-types.ts`, Prisma enum |
| Data model foundation | `prisma/schema.prisma` |
| Mobile-first home + search results (demo data) | `src/app/[lang]/` |

## Section 2 — user roles
| Role | Area | Can do |
|---|---|---|
| Client | `/[lang]/account` | See upcoming and past sessions (booking and payment arrive in later sections) |
| Psychologist | `/[lang]/dashboard` | See verification status, set prices per session format, edit profile in el/en, see upcoming sessions and clients |
| Admin | `/[lang]/admin` | Analytics overview, approve/reject licenses, suspend/reactivate users, review and resolve disputes; every action goes to the audit log |

- Permissions live in `src/domain/roles.ts`; check them with `can(role, permission)`.
- Auth is built in (no third-party provider): scrypt password hashes, random
  session tokens stored hashed in `AuthSession`, httpOnly cookie, sign-in
  rate limiting (in-memory; use Redis with more than one server).
- `src/proxy.ts` sends signed-out visitors to sign-in; every page and Server
  Action re-checks the session and role against the database.
- Admins can't sign up; they're created by the seed (or directly in the DB).
- Psychologists sign up with license number and issuing authority. Their
  profile stays out of search until an admin verifies it.

### Not yet
Email verification and password reset (need an email provider), license
document upload, opening disputes from the client side (needs booking),
weekly availability (booking section).

### Adding a language
1. Add the code to `locales` and its entries in `src/i18n/config.ts`.
2. Add `src/i18n/dictionaries/<code>.ts` typed as `Dictionary`.
3. Add the value to the `Locale` enum in `prisma/schema.prisma`.

### Adding a country
Add an entry to `markets` in `src/config/market.ts` with **verified** crisis
line numbers, and a `Country` row in the database.

## Notes
- Search currently runs on `src/data/demo-therapists.ts` (fictional people);
  it is shaped like the future database query.
- Money is always integer cents + currency; timestamps are UTC.

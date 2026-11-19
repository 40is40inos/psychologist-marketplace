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
Database (when needed): `npm run db:migrate`.

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

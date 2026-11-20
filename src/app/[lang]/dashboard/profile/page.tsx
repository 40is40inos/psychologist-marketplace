import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, ExternalLink, FileText } from "lucide-react";
import {
  continueFromPrices,
  removeDocument,
  saveEducation,
  saveLicense,
  saveOffice,
  savePayout,
  savePersonal,
  saveProfileMedia,
  saveSpecialties,
  submitForVerification,
} from "@/actions/onboarding";
import { PROFESSIONAL_TITLES } from "@/domain/professional-titles";
import { getTaxonomy } from "@/lib/taxonomy-data";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { fill, formatShortDate } from "@/lib/format";
import { onboardingChecklist, ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding";
import { requirePsychologist } from "@/lib/workspace";
import { StepForm } from "@/components/onboarding/step-form";
import { PricesForm, type PricesFormData } from "@/components/dashboard/prices-form";
import { Avatar } from "@/components/avatar";
import { Field, inputClass, textareaClass, buttonClass } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { UploadField } from "@/components/onboarding/upload-field";
import { directUploads } from "@/lib/storage";

export const metadata: Metadata = { robots: { index: false } };

export default function ProfileWizardPage(props: PageProps<"/[lang]/dashboard/profile">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Wizard {...props} />
    </Suspense>
  );
}

async function Wizard({ params, searchParams }: PageProps<"/[lang]/dashboard/profile">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const { profileId } = await requirePsychologist(lang, `/${lang}/dashboard/profile`);
  const sp = await searchParams;
  const checklist = await onboardingChecklist(profileId);
  const requested = String(sp.step ?? "");
  const firstMissing = ONBOARDING_STEPS.find((s) => s !== "review" && !checklist[s]) ?? "review";
  const step: OnboardingStep = (ONBOARDING_STEPS as readonly string[]).includes(requested) ? (requested as OnboardingStep) : firstMissing;
  const index = ONBOARDING_STEPS.indexOf(step);
  const t = dict.onboarding;
  const base = `/${lang}/dashboard/profile`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav aria-label={t.title} className="lg:sticky lg:top-20 lg:self-start">
        <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.intro}</p>
        <ol className="mt-5 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {ONBOARDING_STEPS.map((s, i) => {
            const done = s !== "review" && checklist[s];
            return (
              <li key={s} className="shrink-0">
                <Link
                  href={`${base}?step=${s}`}
                  aria-current={s === step ? "step" : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${s === step ? "bg-primary-soft font-semibold text-primary" : "text-ink hover:bg-surface-muted"}`}
                >
                  {done ? <CheckCircle2 className="size-4 text-primary" aria-hidden="true" /> : <Circle className="size-4 text-muted" aria-hidden="true" />}
                  <span className="sr-only">{done ? t.complete : t.missing}: </span>
                  {i + 1}. {t.steps[s]}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <p className="text-sm text-muted">{fill(t.stepOf, { current: index + 1, total: ONBOARDING_STEPS.length })}</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">{t.steps[step]}</h2>
        <div className="mt-6">
          <Step step={step} profileId={profileId} locale={lang} dict={dict} checklist={checklist} back={index > 0 ? `${base}?step=${ONBOARDING_STEPS[index - 1]}` : undefined} />
        </div>
      </section>
    </div>
  );
}

async function Step({
  step,
  profileId,
  locale,
  dict,
  checklist,
  back,
}: {
  step: OnboardingStep;
  profileId: string;
  locale: Locale;
  dict: Dictionary;
  checklist: Awaited<ReturnType<typeof onboardingChecklist>>;
  back?: string;
}) {
  const t = dict.onboarding;
  const p = await db.psychologistProfile.findUniqueOrThrow({
    where: { id: profileId },
    include: {
      user: { select: { name: true, phone: true } },
      documents: { orderBy: { createdAt: "desc" } },
      education: { orderBy: { sortOrder: "asc" } },
      specialties: { select: { specialty: { select: { slug: true } } } },
      translations: true,
      offerings: true,
      offices: { take: 1, include: { city: { select: { slug: true } } } },
    },
  });
  const tx = await getTaxonomy(locale);
  const errors = {
    invalid: dict.workspace.saveError,
    iban: t.ibanInvalid,
    taxId: t.taxIdInvalid,
    incomplete: t.cannotSubmit,
    ...t.uploadErrors,
  };
  const common = { locale, errors, backHref: back, backLabel: t.back, submitLabel: t.next };
  const chosen = new Set(p.specialties.map((s) => s.specialty.slug));
  const check = "size-4 shrink-0 accent-[var(--primary)]";
  const chip = "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm text-ink has-[:checked]:border-primary has-[:checked]:bg-primary-soft/60";

  switch (step) {
    case "personal":
      return (
        <StepForm action={savePersonal} {...common}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="name" label={dict.auth.name}><input id="name" name="name" required defaultValue={p.user.name} className={inputClass} autoComplete="name" /></Field>
            <Field id="phone" label={t.phone}><input id="phone" name="phone" type="tel" defaultValue={p.user.phone ?? ""} className={inputClass} autoComplete="tel" /></Field>
            <Field id="title" label={t.proTitle}>
              <select id="title" name="title" defaultValue={p.title} className={`${inputClass} appearance-none`}>
                {PROFESSIONAL_TITLES.map((x) => <option key={x} value={x}>{dict.titles[x]}</option>)}
              </select>
            </Field>
            <Field id="practisingSince" label={t.practisingSince}><input id="practisingSince" name="practisingSince" inputMode="numeric" required defaultValue={p.practisingSince ?? ""} className={inputClass} /></Field>
            <Field id="gender" label={t.gender}>
              <select id="gender" name="gender" defaultValue={p.gender} className={`${inputClass} appearance-none`}>
                {(["female", "male", "nonbinary"] as const).map((g) => <option key={g} value={g}>{dict.taxonomy.genders[g]}</option>)}
                <option value="undisclosed">{t.genderUndisclosed}</option>
              </select>
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">{t.languages}</legend>
            <div className="flex flex-wrap gap-2">
              {tx.languages.map((l) => (
                <label key={l.slug} className={chip}><input type="checkbox" name="sessionLanguages" value={l.slug} defaultChecked={p.sessionLanguages.includes(l.slug)} className={check} />{l.label}</label>
              ))}
            </div>
          </fieldset>
        </StepForm>
      );

    case "license": {
      const docs = p.documents.filter((d) => d.kind === "license" || d.kind === "identity");
      return (
        <>
          <StepForm action={saveLicense} {...common}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="licenseNumber" label={t.licenseNumber}><input id="licenseNumber" name="licenseNumber" required defaultValue={p.licenseNumber} className={inputClass} /></Field>
              <Field id="licensingAuthority" label={t.licensingAuthority}><input id="licensingAuthority" name="licensingAuthority" required defaultValue={p.licensingAuthority} className={inputClass} /></Field>
            </div>
            {(["license", "identity"] as const).map((kind) => {
              const current = docs.find((d) => d.kind === kind);
              return (
                <Field key={kind} id={`${kind}File`} label={kind === "license" ? t.licenseUpload : t.idUpload} hint={t.uploadHint}>
                  {current && (
                    <p className="mb-2 flex items-center gap-2 text-sm text-ink">
                      <FileText className="size-4 text-primary" aria-hidden="true" />
                      {t.uploaded}: <a href={`/api/documents/${current.id}`} target="_blank" className="font-medium text-primary underline" rel="noreferrer">{current.filename}</a>
                    </p>
                  )}
                  <UploadField id={`${kind}File`} kind={kind} direct={directUploads} accept="application/pdf,image/jpeg,image/png,image/webp" describedBy={`${kind}File-hint`} t={t.upload} />
                </Field>
              );
            })}
          </StepForm>
          {docs.length > 0 && (
            <ul className="mt-4 space-y-2">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-sm text-muted">
                  <span className="truncate">{d.filename} · {formatShortDate(d.createdAt, locale)}</span>
                  <form action={removeDocument}>
                    <input type="hidden" name="documentId" value={d.id} />
                    <button type="submit" className="font-medium text-accent hover:underline">{t.remove}</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </>
      );
    }

    case "credentials": {
      const rows = [...p.education, ...Array.from({ length: Math.max(1, 3 - p.education.length) }, () => null)];
      return (
        <StepForm action={saveEducation} {...common}>
          <ul className="space-y-4">
            {rows.map((e, i) => (
              <li key={e?.id ?? `new-${i}`} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[2fr_2fr_6rem]">
                <label className="block"><span className="mb-1 block text-xs font-medium text-muted">{t.degree}</span><input name="degree" defaultValue={e?.degree} className={inputClass} /></label>
                <label className="block"><span className="mb-1 block text-xs font-medium text-muted">{t.institution}</span><input name="institution" defaultValue={e?.institution} className={inputClass} /></label>
                <label className="block"><span className="mb-1 block text-xs font-medium text-muted">{t.year}</span><input name="year" inputMode="numeric" defaultValue={e?.year ?? ""} className={inputClass} /></label>
              </li>
            ))}
          </ul>
        </StepForm>
      );
    }

    case "specialties":
      return (
        <StepForm action={saveSpecialties} {...common}>
          {([["concerns", t.concerns, tx.concerns], ["approaches", t.approaches, tx.approaches], ["clientTypes", t.clientTypes, tx.clientTypes]] as const).map(([name, label, list]) => (
            <fieldset key={name}>
              <legend className="mb-2 text-sm font-medium text-ink">{label}</legend>
              <div className="flex flex-wrap gap-2">
                {list.map((item) => (
                  <label key={item.slug} className={chip}>
                    <input type="checkbox" name={name} value={item.slug} defaultChecked={chosen.has(item.slug)} className={check} />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </StepForm>
      );

    case "profile":
      return (
        <StepForm action={saveProfileMedia} {...common}>
          <div className="flex items-center gap-4">
            <Avatar name={p.user.name} photoUrl={p.photoUrl} size="lg" />
            <Field id="photoFile" label={t.photo} hint={t.photoHint}>
              <ul className="mb-3 list-disc space-y-0.5 pl-5 text-sm text-muted">
                {t.photoTips.map((tip) => <li key={tip}>{tip}</li>)}
              </ul>
              <UploadField id="photoFile" kind="photo" direct={directUploads} accept="image/jpeg,image/png,image/webp" t={t.upload} />
            </Field>
          </div>
          <Field id="videoUrl" label={t.videoUrl} hint={t.videoHint}><input id="videoUrl" name="videoUrl" type="url" defaultValue={p.videoUrl ?? ""} className={inputClass} /></Field>
          {locales.map((l) => {
            const tr = p.translations.find((x) => x.locale === l);
            return (
              <fieldset key={l} lang={l} className="space-y-4 rounded-2xl border border-border p-4">
                <legend className="px-1 text-sm font-semibold text-ink">{fill(dict.dashboard.textIn, { language: dict.languages[l] })}</legend>
                <Field id={`headline_${l}`} label={dict.dashboard.headline} hint={dict.dashboard.headlineHint}><input id={`headline_${l}`} name={`headline_${l}`} maxLength={120} defaultValue={tr?.headline} className={inputClass} /></Field>
                <Field id={`bio_${l}`} label={dict.dashboard.bio}><textarea id={`bio_${l}`} name={`bio_${l}`} rows={5} maxLength={3000} defaultValue={tr?.bio} className={textareaClass} /></Field>
                <Field id={`approach_${l}`} label={dict.dashboard.approach}><textarea id={`approach_${l}`} name={`approach_${l}`} rows={3} maxLength={2000} defaultValue={tr?.approach ?? ""} className={textareaClass} /></Field>
              </fieldset>
            );
          })}
        </StepForm>
      );

    case "prices": {
      const data: PricesFormData = Object.fromEntries(p.offerings.map((o) => [o.type, { active: o.active, durationMinutes: o.durationMinutes, priceCents: o.priceCents }]));
      return (
        <div className="space-y-6">
          <p className="text-sm text-muted">{dict.dashboard.pricesSubtitle}</p>
          <PricesForm data={data} t={dict.dashboard} sessionTypes={dict.sessionTypes} introCall={p.introCallEnabled} />
          <form action={continueFromPrices} className="flex items-center justify-between gap-3 border-t border-border pt-5">
            <input type="hidden" name="locale" value={locale} />
            {back ? <Link href={back} className="inline-flex h-11 items-center rounded-xl px-3 font-medium text-ink hover:bg-surface-muted">← {t.back}</Link> : <span />}
            <SubmitButton variant="secondary">{dict.match.next} →</SubmitButton>
          </form>
        </div>
      );
    }

    case "offices": {
      const office = p.offices[0];
      const cities = await db.city.findMany({ select: { slug: true, translations: { where: { locale }, select: { name: true } } } });
      return (
        <StepForm action={saveOffice} {...common}>
          <label className="flex gap-3 rounded-xl border border-border p-4">
            <input type="checkbox" name="onlineOnly" defaultChecked={!office && !p.offerings.some((o) => o.type === "in_person" && o.active)} className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
            <span className="text-ink">{t.noOffice}</span>
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="addressLine" label={t.address}><input id="addressLine" name="addressLine" defaultValue={office?.addressLine} className={inputClass} autoComplete="street-address" /></Field>
            <Field id="postalCode" label={t.postalCode}><input id="postalCode" name="postalCode" defaultValue={office?.postalCode} inputMode="numeric" className={inputClass} autoComplete="postal-code" /></Field>
            <Field id="city" label={t.city}>
              <select id="city" name="city" defaultValue={office?.city.slug} className={`${inputClass} appearance-none`}>
                {cities.map((c) => <option key={c.slug} value={c.slug}>{c.translations[0]?.name ?? c.slug}</option>)}
              </select>
            </Field>
            <div />
            <Field id="latitude" label={t.latitude} hint={t.coordsHint}><input id="latitude" name="latitude" inputMode="decimal" defaultValue={office?.latitude ?? ""} className={inputClass} /></Field>
            <Field id="longitude" label={t.longitude}><input id="longitude" name="longitude" inputMode="decimal" defaultValue={office?.longitude ?? ""} className={inputClass} /></Field>
          </div>
          <label className="flex items-center gap-3 text-ink">
            <input type="checkbox" name="wheelchair" defaultChecked={office?.wheelchairAccessible} className="size-5 accent-[var(--primary)]" />
            {t.wheelchair}
          </label>
        </StepForm>
      );
    }

    case "payout":
      return (
        <StepForm action={savePayout} {...common}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="accountHolder" label={t.accountHolder}><input id="accountHolder" name="accountHolder" required defaultValue={p.payoutAccountHolder ?? p.user.name} className={inputClass} /></Field>
            <Field id="iban" label={t.iban} hint={p.payoutIbanLast4 ? fill(t.savedIban, { last4: p.payoutIbanLast4 }) : t.ibanHint}>
              <input id="iban" name="iban" autoComplete="off" placeholder="GR16 0110 1250 0000 0001 2300 695" className={`${inputClass} font-mono uppercase`} />
            </Field>
            <Field id="taxId" label={t.taxId} hint={p.taxIdEncrypted ? "✓" : undefined}>
              <input id="taxId" name="taxId" inputMode="numeric" maxLength={9} autoComplete="off" className={`${inputClass} font-mono`} />
            </Field>
            <Field id="taxOffice" label={t.taxOffice}><input id="taxOffice" name="taxOffice" defaultValue={p.taxOffice ?? ""} className={inputClass} /></Field>
          </div>
        </StepForm>
      );

    case "review": {
      const missing = Object.entries(checklist).filter(([, ok]) => !ok).map(([k]) => k as Exclude<OnboardingStep, "review">);
      return (
        <div className="space-y-6">
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {Object.entries(checklist).map(([k, ok]) => (
              <li key={k} className="flex items-center justify-between gap-3 p-4">
                <span className="flex items-center gap-2 text-ink">
                  {ok ? <CheckCircle2 className="size-5 text-primary" aria-hidden="true" /> : <Circle className="size-5 text-muted" aria-hidden="true" />}
                  {t.steps[k as Exclude<OnboardingStep, "review">]}
                </span>
                {ok ? <span className="text-sm text-muted">{t.complete}</span> : <Link href={`?step=${k}`} className="text-sm font-semibold text-primary hover:underline">{t.missing} →</Link>}
              </li>
            ))}
          </ul>
          {p.submittedAt && <p className="rounded-xl bg-primary-soft p-4 text-sm text-ink">{fill(t.submitted, { date: formatShortDate(p.submittedAt, locale) })}</p>}
          <StepForm action={submitForVerification} {...common} submitLabel={t.submit}>
            {missing.length > 0 && <p className="text-sm text-muted">{t.cannotSubmit}</p>}
          </StepForm>
          {p.verificationStatus === "verified" && (
            <Link href={`/${locale}/psychologists/${p.slug}`} className={buttonClass.secondary}>
              <ExternalLink className="size-4" aria-hidden="true" />
              {dict.nav.findPsychologist}
            </Link>
          )}
        </div>
      );
    }
  }
}

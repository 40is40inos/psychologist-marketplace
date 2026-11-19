/**
 * English dictionary. This file is the source of truth for the shape of
 * every dictionary: el.ts is typed against it, so a missing or extra key
 * in a translation fails the type check.
 *
 * Placeholders use {name} syntax and are filled with `fill()` from
 * src/lib/format.ts. The brand name is never hardcoded: use {brand}.
 */
const en = {
  meta: {
    title: "{brand} | Find and book a licensed psychologist",
    description:
      "Compare licensed psychologists and psychotherapists in Greece. See prices, approaches and availability, and book in-person, video or phone sessions.",
  },
  a11y: {
    skipToContent: "Skip to content",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    mainNav: "Main navigation",
    changeLanguage: "Change language",
  },
  nav: {
    findPsychologist: "Find a psychologist",
    howItWorks: "How it works",
    forPsychologists: "For psychologists",
    signIn: "Sign in",
  },
  sessionTypes: {
    in_person: {
      label: "In person",
      short: "Office",
      description: "Meet at the psychologist's office.",
    },
    video: {
      label: "Video",
      short: "Video",
      description: "Secure video session from wherever you feel comfortable.",
    },
    phone: {
      label: "Phone",
      short: "Phone",
      description: "Talk by phone, no camera needed.",
    },
  },
  price: {
    perSession: "per session",
    from: "from {price}",
    minutes: "{minutes} min",
  },
  home: {
    eyebrow: "Licensed psychologists and psychotherapists",
    heroTitle: "Find the right person to talk to",
    heroSubtitle:
      "Compare verified psychologists by what you need help with, how they work and what they charge. Book in person, by video or by phone.",
    concernsTitle: "Common reasons people reach out",
    sessionTypesTitle: "Choose how you meet",
    sessionTypesSubtitle:
      "Every profile shows which formats are offered and the price for each.",
    howTitle: "How it works",
    howSteps: [
      {
        title: "Tell us what you need",
        body: "Search by concern, city or format. No account needed to browse.",
      },
      {
        title: "Compare with clear information",
        body: "See approach, languages, experience and the price per session up front.",
      },
      {
        title: "Book a time that suits you",
        body: "Pick a free slot and get a confirmation straight away.",
      },
    ],
    trustTitle: "Built for mental-health care",
    trustItems: [
      {
        title: "Verified licenses",
        body: "We check every psychologist's license to practise before their profile goes live.",
      },
      {
        title: "Private by design",
        body: "Your bookings and messages are visible only to you and your psychologist, in line with GDPR.",
      },
      {
        title: "Transparent prices",
        body: "Prices are shown per session in euros, with no hidden fees.",
      },
    ],
    featuredTitle: "Psychologists available this week",
    featuredCta: "See all psychologists",
    ctaTitle: "Are you a licensed psychologist?",
    ctaBody:
      "Reach people looking for support, manage your calendar and get paid, in one place.",
    ctaButton: "Join {brand}",
  },
  search: {
    concernLabel: "What would you like help with?",
    concernPlaceholder: "e.g. anxiety, relationships, burnout",
    locationLabel: "Where?",
    locationPlaceholder: "City or area",
    anyLocation: "Anywhere",
    sessionTypeLabel: "Format",
    anySessionType: "Any format",
    submit: "Search",
  },
  concerns: {
    anxiety: "Anxiety",
    depression: "Depression",
    relationships: "Relationships",
    stress: "Stress and burnout",
    trauma: "Trauma",
    grief: "Grief and loss",
    selfEsteem: "Self-esteem",
    parenting: "Parenting",
  },
  results: {
    title: "Psychologists",
    titleIn: "Psychologists in {city}",
    count: "{count} psychologists found",
    countOne: "1 psychologist found",
    empty: "No psychologists match these filters yet.",
    emptyHint: "Try another format or remove the location.",
    clearFilters: "Clear filters",
    verified: "License verified",
    yearsExperience: "{years} years of experience",
    speaks: "Speaks {languages}",
    nextAvailable: "Next available: {date}",
    viewProfile: "View profile",
    online: "Online",
  },
  crisis: {
    title: "Need help right now?",
    body: "This platform is not for emergencies. If you or someone else is in danger, call {emergency}. For immediate emotional support, call the suicide prevention line {suicide} or the 24-hour mental health line {mentalHealth}.",
  },
  footer: {
    tagline: "A marketplace for licensed psychologists and psychotherapists.",
    platform: "Platform",
    company: "Company",
    legal: "Legal",
    about: "About us",
    contact: "Contact",
    privacy: "Privacy policy",
    terms: "Terms of use",
    cookies: "Cookie policy",
    rights: "© {year} {brand}. All rights reserved.",
  },
  languages: {
    el: "Greek",
    en: "English",
    fr: "French",
    de: "German",
  },
  notFound: {
    title: "Page not found",
    body: "The page you are looking for does not exist or has moved.",
    back: "Back to home",
  },
};

type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Widen<U>[]
    : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof en>;

export default en satisfies Dictionary;

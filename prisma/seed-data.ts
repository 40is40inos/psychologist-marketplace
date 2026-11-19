/**
 * Fictional psychologists for development and demos. Not real people.
 */
import type { Approach, ClientType, Concern } from "../src/domain/taxonomy";

type L = { el: string; en: string };
type Type = "in_person" | "video" | "phone";

export interface SeedCity {
  slug: string;
  name: L;
  lat: number;
  lng: number;
}

export const cities: SeedCity[] = [
  { slug: "athens", name: { el: "Αθήνα", en: "Athens" }, lat: 37.9838, lng: 23.7275 },
  { slug: "thessaloniki", name: { el: "Θεσσαλονίκη", en: "Thessaloniki" }, lat: 40.6401, lng: 22.9444 },
  { slug: "patras", name: { el: "Πάτρα", en: "Patras" }, lat: 38.2466, lng: 21.7346 },
  { slug: "heraklion", name: { el: "Ηράκλειο", en: "Heraklion" }, lat: 35.3387, lng: 25.1442 },
];

export interface SeedPsychologist {
  slug: string;
  name: L;
  gender: "female" | "male" | "nonbinary";
  title: "psychologist" | "psychotherapist" | "clinical_psychologist" | "counselling_psychologist";
  headline: L;
  bio: L;
  approachText: L;
  since: number;
  languages: string[];
  concerns: Concern[];
  approaches: Approach[];
  clientTypes: ClientType[];
  offerings: { type: Type; minutes: number; euros: number }[];
  office?: { city: string; address: string; postal: string; lat: number; lng: number; wheelchair?: boolean };
  introCall?: boolean;
  education: { degree: string; institution: string; year: number }[];
  /** [weekday 1-7, "HH:MM", "HH:MM", types?] */
  hours: [number, string, string, Type[]?][];
  faq?: { q: L; a: L }[];
  video?: string;
}

const weekdays = (from: string, to: string, days = [1, 2, 3, 4, 5]): [number, string, string][] =>
  days.map((d) => [d, from, to]);

export const psychologists: SeedPsychologist[] = [
  {
    slug: "eleni-papadopoulou",
    name: { el: "Ελένη Παπαδοπούλου", en: "Eleni Papadopoulou" },
    gender: "female",
    title: "clinical_psychologist",
    headline: { el: "Γνωσιακή-συμπεριφορική θεραπεία για άγχος και κρίσεις πανικού", en: "Cognitive behavioural therapy for anxiety and panic" },
    bio: {
      el: "Δουλεύω με ενήλικες που νιώθουν ότι το άγχος έχει αρχίσει να καθορίζει την καθημερινότητά τους. Μαζί βρίσκουμε τι το συντηρεί και δοκιμάζουμε πρακτικούς τρόπους να ανακτήσετε τον έλεγχο, με τον δικό σας ρυθμό.",
      en: "I work with adults who feel anxiety has started to run their days. Together we look at what keeps it going and try practical ways to take back control, at your own pace.",
    },
    approachText: {
      el: "Οι συνεδρίες είναι δομημένες, με σαφείς στόχους και μικρές ασκήσεις ανάμεσά τους. Συνήθως 12-20 συνεδρίες.",
      en: "Sessions are structured, with clear goals and small exercises in between. Usually 12–20 sessions.",
    },
    since: 2011,
    languages: ["el", "en"],
    concerns: ["anxiety", "panic", "stress", "self_esteem", "ocd"],
    approaches: ["cbt", "act"],
    clientTypes: ["individuals", "adolescents"],
    offerings: [
      { type: "in_person", minutes: 50, euros: 70 },
      { type: "video", minutes: 50, euros: 60 },
    ],
    office: { city: "athens", address: "Σκουφά 42, Κολωνάκι", postal: "106 73", lat: 37.9795, lng: 23.7395, wheelchair: true },
    introCall: true,
    education: [
      { degree: "MSc Clinical Psychology", institution: "King's College London", year: 2010 },
      { degree: "BSc Psychology", institution: "University of Athens", year: 2008 },
    ],
    hours: [...weekdays("09:00", "14:00", [1, 2, 3, 4]), [2, "17:00", "21:00"], [4, "17:00", "21:00", ["video"]]],
    faq: [
      {
        q: { el: "Πόσο διαρκεί η θεραπεία;", en: "How long does therapy last?" },
        a: { el: "Για το άγχος συνήθως 12-20 εβδομαδιαίες συνεδρίες. Το συζητάμε από την πρώτη συνάντηση.", en: "For anxiety, usually 12–20 weekly sessions. We discuss it in the first meeting." },
      },
      {
        q: { el: "Εκδίδετε απόδειξη για ασφαλιστικό ταμείο;", en: "Do you issue receipts for insurance?" },
        a: { el: "Ναι, εκδίδω ηλεκτρονική απόδειξη για κάθε συνεδρία.", en: "Yes, I issue an electronic receipt for every session." },
      },
    ],
  },
  {
    slug: "nikos-georgiou",
    name: { el: "Νίκος Γεωργίου", en: "Nikos Georgiou" },
    gender: "male",
    title: "psychotherapist",
    headline: { el: "Συστημική θεραπεία για ζευγάρια και οικογένειες", en: "Systemic therapy for couples and families" },
    bio: {
      el: "Βοηθώ ζευγάρια και οικογένειες να ξαναβρούν τρόπους να μιλούν μεταξύ τους. Δεν αναζητούμε ενόχους· κοιτάμε τα μοτίβα που κρατούν όλους κολλημένους.",
      en: "I help couples and families find their way back to talking to each other. We don't look for someone to blame; we look at the patterns that keep everyone stuck.",
    },
    approachText: { el: "Συνεδρίες 60 λεπτών, κάθε μία ή δύο εβδομάδες.", en: "60-minute sessions, weekly or every two weeks." },
    since: 2008,
    languages: ["el"],
    concerns: ["relationships", "parenting", "life_transitions"],
    approaches: ["systemic"],
    clientTypes: ["couples", "families", "individuals"],
    offerings: [
      { type: "in_person", minutes: 60, euros: 80 },
      { type: "video", minutes: 60, euros: 70 },
      { type: "phone", minutes: 50, euros: 55 },
    ],
    office: { city: "thessaloniki", address: "Τσιμισκή 87", postal: "546 22", lat: 40.6325, lng: 22.9446 },
    education: [{ degree: "Πιστοποίηση στη Συστημική Θεραπεία", institution: "Ελληνική Εταιρεία Συστημικής Θεραπείας", year: 2012 }],
    hours: [...weekdays("10:00", "13:00", [1, 3, 5]), ...weekdays("17:00", "21:00", [1, 2, 3, 4])],
  },
  {
    slug: "maria-konstantinou",
    name: { el: "Μαρία Κωνσταντίνου", en: "Maria Konstantinou" },
    gender: "female",
    title: "psychologist",
    headline: { el: "Υποστήριξη στο πένθος και σε μεγάλες αλλαγές ζωής", en: "Support through grief and major life changes" },
    bio: {
      el: "Η απώλεια δεν έχει σωστό τρόπο ή χρονοδιάγραμμα. Προσφέρω έναν ήρεμο χώρο για να μιλήσετε για αυτό που ζείτε, χωρίς βιασύνη.",
      en: "Loss has no right way or timeline. I offer a calm space to talk about what you're going through, without hurry.",
    },
    approachText: { el: "Ανθρωπιστική προσέγγιση με στοιχεία ACT.", en: "Humanistic approach with elements of ACT." },
    since: 2016,
    languages: ["el", "en", "fr"],
    concerns: ["grief", "depression", "life_transitions"],
    approaches: ["humanistic", "act"],
    clientTypes: ["individuals"],
    offerings: [
      { type: "video", minutes: 50, euros: 50 },
      { type: "phone", minutes: 50, euros: 45 },
    ],
    introCall: true,
    education: [{ degree: "Master en psychologie clinique", institution: "Université Paris Cité", year: 2015 }],
    hours: [...weekdays("08:00", "12:00"), [6, "10:00", "14:00"]],
  },
  {
    slug: "dimitris-alexiou",
    name: { el: "Δημήτρης Αλεξίου", en: "Dimitris Alexiou" },
    gender: "male",
    title: "clinical_psychologist",
    headline: { el: "Θεραπεία τραύματος με EMDR", en: "Trauma-focused therapy with EMDR" },
    bio: {
      el: "Εξειδικεύομαι στη θεραπεία τραυματικών εμπειριών, από ατυχήματα έως παιδικό τραύμα. Η ασφάλεια και ο έλεγχος μένουν πάντα σε εσάς.",
      en: "I specialise in treating traumatic experiences, from accidents to childhood trauma. Safety and control always stay with you.",
    },
    approachText: { el: "EMDR και τραυματοεστιασμένη CBT.", en: "EMDR and trauma-focused CBT." },
    since: 2013,
    languages: ["el", "en"],
    concerns: ["trauma", "anxiety", "panic", "sleep"],
    approaches: ["emdr", "cbt"],
    clientTypes: ["individuals", "adolescents"],
    offerings: [
      { type: "in_person", minutes: 50, euros: 65 },
      { type: "video", minutes: 50, euros: 65 },
    ],
    office: { city: "patras", address: "Μαιζώνος 120", postal: "262 21", lat: 38.2471, lng: 21.7366 },
    education: [{ degree: "EMDR Europe Accredited Practitioner", institution: "EMDR Europe", year: 2017 }],
    hours: weekdays("11:00", "19:00", [1, 2, 4, 5]),
  },
  {
    slug: "sofia-makri",
    name: { el: "Σοφία Μακρή", en: "Sofia Makri" },
    gender: "female",
    title: "psychotherapist",
    headline: { el: "Επαγγελματική εξουθένωση και ισορροπία εργασίας-ζωής", en: "Burnout and work-life balance" },
    bio: {
      el: "Συνεργάζομαι με ανθρώπους που νιώθουν εξαντλημένοι από τη δουλειά ή τις απαιτήσεις τους. Ξαναχτίζουμε όρια και ενέργεια.",
      en: "I work with people who feel worn out by work or the demands on them. We rebuild boundaries and energy.",
    },
    approachText: { el: "Θεραπεία σχημάτων και Gestalt.", en: "Schema therapy and Gestalt." },
    since: 2018,
    languages: ["el", "en", "de"],
    concerns: ["stress", "self_esteem", "depression", "eating"],
    approaches: ["schema", "gestalt"],
    clientTypes: ["individuals"],
    offerings: [
      { type: "in_person", minutes: 50, euros: 55 },
      { type: "video", minutes: 50, euros: 50 },
      { type: "phone", minutes: 50, euros: 45 },
    ],
    office: { city: "heraklion", address: "Λεωφ. Καλοκαιρινού 55", postal: "712 02", lat: 35.3393, lng: 25.1305 },
    introCall: true,
    education: [{ degree: "MA Counselling Psychology", institution: "Universität Wien", year: 2017 }],
    hours: [...weekdays("09:00", "17:00", [1, 2, 3]), [6, "09:00", "13:00", ["video", "phone"]]],
  },
  {
    slug: "giorgos-vlachos",
    name: { el: "Γιώργος Βλάχος", en: "Giorgos Vlachos" },
    gender: "male",
    title: "psychologist",
    headline: { el: "Ψυχοδυναμική ψυχοθεραπεία για ενήλικες", en: "Psychodynamic psychotherapy for adults" },
    bio: {
      el: "Μαζί εξερευνούμε πώς οι παλιότερες εμπειρίες επηρεάζουν τις σημερινές σχέσεις και επιλογές σας.",
      en: "Together we explore how earlier experiences shape your relationships and choices today.",
    },
    approachText: { el: "Μακροχρόνια ψυχοδυναμική ψυχοθεραπεία, 1-2 φορές την εβδομάδα.", en: "Longer-term psychodynamic therapy, once or twice a week." },
    since: 2005,
    languages: ["el"],
    concerns: ["depression", "relationships", "self_esteem", "addiction"],
    approaches: ["psychodynamic"],
    clientTypes: ["individuals"],
    offerings: [{ type: "in_person", minutes: 50, euros: 90 }],
    office: { city: "athens", address: "Υμηττού 110, Παγκράτι", postal: "116 33", lat: 37.9661, lng: 23.7489 },
    education: [{ degree: "PhD Psychology", institution: "Aristotle University of Thessaloniki", year: 2004 }],
    hours: weekdays("14:00", "21:00", [1, 2, 3, 4]),
  },
  {
    slug: "anna-christodoulou",
    name: { el: "Άννα Χριστοδούλου", en: "Anna Christodoulou" },
    gender: "female",
    title: "clinical_psychologist",
    headline: { el: "Παιδιά, έφηβοι και υποστήριξη γονέων", en: "Children, teenagers and parent support" },
    bio: {
      el: "Δουλεύω με παιδιά από 6 ετών και εφήβους, καθώς και με τους γονείς τους, για άγχος, σχολικές δυσκολίες και συναισθηματική ρύθμιση.",
      en: "I work with children from age 6 and teenagers, and with their parents, on anxiety, school difficulties and emotional regulation.",
    },
    approachText: { el: "Παιγνιοθεραπεία και CBT προσαρμοσμένη στην ηλικία.", en: "Play therapy and age-adapted CBT." },
    since: 2014,
    languages: ["el", "en"],
    concerns: ["anxiety", "parenting", "self_esteem", "ocd"],
    approaches: ["cbt", "systemic"],
    clientTypes: ["children", "adolescents", "families"],
    offerings: [
      { type: "in_person", minutes: 45, euros: 60 },
      { type: "video", minutes: 45, euros: 55 },
    ],
    office: { city: "athens", address: "Κηφισίας 220, Μαρούσι", postal: "151 24", lat: 38.0478, lng: 23.8049, wheelchair: true },
    introCall: true,
    education: [{ degree: "MSc Child Psychology", institution: "University of Crete", year: 2013 }],
    hours: [...weekdays("15:00", "20:00"), [6, "10:00", "14:00", ["in_person"]]],
  },
  {
    slug: "kostas-ioannou",
    name: { el: "Κώστας Ιωάννου", en: "Kostas Ioannou" },
    gender: "male",
    title: "counselling_psychologist",
    headline: { el: "Εξαρτήσεις και ανάρρωση", en: "Addiction and recovery" },
    bio: {
      el: "Συνοδεύω ανθρώπους στη διαδρομή απεξάρτησης από ουσίες, αλκοόλ ή τζόγο, χωρίς κριτική.",
      en: "I support people on the path away from drugs, alcohol or gambling, without judgement.",
    },
    approachText: { el: "Κινητοποιητική συνέντευξη και CBT.", en: "Motivational interviewing and CBT." },
    since: 2010,
    languages: ["el", "en"],
    concerns: ["addiction", "depression", "stress"],
    approaches: ["cbt", "humanistic"],
    clientTypes: ["individuals", "families"],
    offerings: [
      { type: "video", minutes: 50, euros: 50 },
      { type: "phone", minutes: 50, euros: 40 },
      { type: "in_person", minutes: 50, euros: 55 },
    ],
    office: { city: "thessaloniki", address: "Μεταμορφώσεως 10, Καλαμαριά", postal: "551 32", lat: 40.5838, lng: 22.9517 },
    education: [{ degree: "MSc Addiction Studies", institution: "University of Macedonia", year: 2009 }],
    hours: [...weekdays("09:00", "13:00"), ...weekdays("18:00", "21:00", [2, 4])],
  },
  {
    slug: "alex-nikolaidis",
    name: { el: "Άλεξ Νικολαΐδης", en: "Alex Nikolaidis" },
    gender: "nonbinary",
    title: "psychologist",
    headline: { el: "Ασφαλής χώρος για ΛΟΑΤΚΙ+ άτομα", en: "A safe space for LGBTQ+ people" },
    bio: {
      el: "Δουλεύω με ΛΟΑΤΚΙ+ άτομα για ταυτότητα, coming out, σχέσεις και το στρες της διάκρισης.",
      en: "I work with LGBTQ+ people on identity, coming out, relationships and the stress of discrimination.",
    },
    approachText: { el: "Ανθρωπιστική και επιβεβαιωτική προσέγγιση.", en: "Humanistic, affirmative approach." },
    since: 2019,
    languages: ["el", "en"],
    concerns: ["lgbtq", "anxiety", "relationships", "self_esteem"],
    approaches: ["humanistic", "act"],
    clientTypes: ["individuals", "couples", "adolescents"],
    offerings: [
      { type: "video", minutes: 50, euros: 45 },
      { type: "in_person", minutes: 50, euros: 50 },
    ],
    office: { city: "athens", address: "Ασκληπιού 30, Εξάρχεια", postal: "106 80", lat: 37.9851, lng: 23.7362 },
    introCall: true,
    education: [{ degree: "MSc Counselling", institution: "Panteion University", year: 2018 }],
    hours: [...weekdays("12:00", "20:00", [1, 2, 3, 4, 5])],
  },
  {
    slug: "katerina-michailidou",
    name: { el: "Κατερίνα Μιχαηλίδου", en: "Katerina Michailidou" },
    gender: "female",
    title: "clinical_psychologist",
    headline: { el: "Διατροφικές διαταραχές και εικόνα σώματος", en: "Eating disorders and body image" },
    bio: {
      el: "Υποστηρίζω εφήβους και ενήλικες με διατροφικές δυσκολίες, σε συνεργασία με διατροφολόγο όταν χρειάζεται.",
      en: "I support teenagers and adults with eating difficulties, working alongside a dietitian when needed.",
    },
    approachText: { el: "CBT-E και θεραπεία σχημάτων.", en: "CBT-E and schema therapy." },
    since: 2012,
    languages: ["el", "en"],
    concerns: ["eating", "self_esteem", "anxiety", "depression"],
    approaches: ["cbt", "schema"],
    clientTypes: ["individuals", "adolescents"],
    offerings: [
      { type: "in_person", minutes: 50, euros: 75 },
      { type: "video", minutes: 50, euros: 70 },
    ],
    office: { city: "athens", address: "Λεωφ. Βουλιαγμένης 12, Γλυφάδα", postal: "166 75", lat: 37.8650, lng: 23.7535 },
    education: [{ degree: "MSc Eating Disorders", institution: "University College London", year: 2011 }],
    hours: weekdays("10:00", "18:00", [2, 3, 4]),
  },
];

/** "HH:MM" -> minutes after midnight. */
export const toMinutes = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Legal page TEMPLATES (privacy, terms, cancellation, cookies). They are a
 * structured starting point, NOT legal advice: legal counsel must review and
 * complete every [bracketed] item before launch.
 *
 * The seed creates missing pages and refreshes pages whose text still begins
 * with the template note, so once an admin edits a page in the CMS (and
 * removes the note) the seed never overwrites it.
 */
import type { SeedContent } from "./seed-content";

export const TEMPLATE_NOTE = {
  el: "> Πρότυπο κείμενο. Πρέπει να ελεγχθεί και να συμπληρωθεί από νομικό σύμβουλο πριν από τη λειτουργία.",
  en: "> Template text. It must be reviewed and completed by legal counsel before launch.",
};
const n = TEMPLATE_NOTE;

const privacyEn = `${n.en}

*Version 2026-11.*

## Who we are

[Company legal name], [address], VAT [number] ("we") runs this platform and is the **data controller** for account, booking, payment and messaging data.

Data Protection Officer: [name], [dpo@example.com].

For **clinical records** that a psychologist keeps on the platform (session notes, documents they upload), the psychologist is the controller and we act as their **processor** under the data processing agreement in the [Terms for psychologists](/en/p/terms-psychologists).

## What we collect and why

| Data | Purpose | Legal basis (GDPR) |
|---|---|---|
| Name, email, phone, password (hashed) | Your account, sign-in, reminders | Contract, Art. 6(1)(b) |
| Bookings, prices, receipts | Booking and paying for sessions; tax records | Contract, Art. 6(1)(b); legal obligation, Art. 6(1)(c) |
| Intake answers, messages, feedback | Helping your psychologist prepare and care for you | **Explicit consent, Art. 9(2)(a)**; health care, Art. 9(2)(h) |
| Psychologist licence and ID documents | Verifying that every psychologist is licensed | Legitimate interest, Art. 6(1)(f); legal obligation |
| Security logs (sign-ins, access to records) | Protecting accounts and sensitive data | Legitimate interest, Art. 6(1)(f); Art. 32 |
| Searches (no account link) | Improving search and coverage | Legitimate interest, Art. 6(1)(f) |

Health information is a **special category** of data. We ask for your explicit consent when you sign up, you can withdraw it any time in *Account > Privacy*, and we only collect what is needed (data minimisation).

We don't sell data, don't use advertising trackers, and don't use your health information for marketing or for training AI models.

## How we protect it

- Messages, intake answers, session notes, tax IDs and bank details are **encrypted at rest** (AES-256-GCM); all traffic uses **TLS**.
- Role-based access: psychologists see only their own clients; support staff see only what a task needs.
- Every access to sensitive records is written to an **audit log**.
- Two-factor authentication is required for psychologists and staff.
- Card details are entered on our payment provider's page; **we never see or store card numbers**.

## Where your data is stored

All data is stored and processed in the **European Union**:

| Processor | Purpose | Location |
|---|---|---|
| [Hosting provider] | Application hosting | [EU region, e.g. Frankfurt] |
| [Database provider] | Database and backups | [EU region, e.g. Frankfurt] |
| [File storage provider] | Uploaded documents | [EU region] |
| Stripe Payments Europe Ltd. | Card payments | Ireland (EU) |
| [Email provider] | Emails | [EU region] |
| [SMS provider] | SMS reminders | [EU region] |
| [Video provider, if enabled] | Video sessions | [EU region; peer-to-peer video sends media directly between participants] |

If a provider transfers data outside the EEA, we rely on an adequacy decision or Standard Contractual Clauses with additional safeguards. [List any such transfers.]

Maps are loaded from OpenStreetMap only after you allow it (see the [Cookie policy](/en/p/cookies)).

## How long we keep it

| Data | Retention |
|---|---|
| Account | While your account is open; deleted or anonymised when you delete it |
| Messages, intake answers | Deleted when you delete your account |
| Session notes | Kept by your psychologist for the period professional rules require [confirm] |
| Receipts and invoices | As Greek tax law requires [currently at least 5 years] |
| Unpaid card holds | Released after 30 minutes |
| Search logs | 13 months |
| Notification logs | 12 months |
| Security and audit logs | [X years] |

## Your rights

You can access, correct, export, restrict, object to, or delete your data, and withdraw consent at any time. Most of this is self-service in *Account > Privacy* (data export as a file, account deletion). For anything else write to [privacy@example.com]; we reply within one month.

You can also complain to the **Hellenic Data Protection Authority** (www.dpa.gr, 1-3 Kifisias Ave., 115 23 Athens) or the authority in your EU country.

## Changes

We'll tell you about material changes by email and ask for consent again where the law requires it.
`;

const privacyEl = `${n.el}

*Έκδοση 2026-11.*

## Ποιοι είμαστε

Η [επωνυμία εταιρείας], [διεύθυνση], ΑΦΜ [αριθμός] («εμείς») λειτουργεί την πλατφόρμα και είναι **υπεύθυνος επεξεργασίας** για δεδομένα λογαριασμού, κρατήσεων, πληρωμών και μηνυμάτων.

Υπεύθυνος Προστασίας Δεδομένων (DPO): [όνομα], [dpo@example.com].

Για το **κλινικό αρχείο** που τηρεί ο ψυχολόγος στην πλατφόρμα (σημειώσεις συνεδριών, έγγραφα), υπεύθυνος επεξεργασίας είναι ο ψυχολόγος και εμείς ενεργούμε ως **εκτελούντες την επεξεργασία** βάσει της σύμβασης επεξεργασίας στους [Όρους για ψυχολόγους](/el/p/terms-psychologists).

## Τι συλλέγουμε και γιατί

| Δεδομένα | Σκοπός | Νομική βάση (ΓΚΠΔ) |
|---|---|---|
| Όνομα, email, τηλέφωνο, κωδικός (κατακερματισμένος) | Λογαριασμός, σύνδεση, υπενθυμίσεις | Σύμβαση, άρθ. 6(1)(β) |
| Κρατήσεις, τιμές, αποδείξεις | Κράτηση και πληρωμή συνεδριών· φορολογικά αρχεία | Σύμβαση, άρθ. 6(1)(β)· νομική υποχρέωση, άρθ. 6(1)(γ) |
| Απαντήσεις εισαγωγής, μηνύματα, σχόλια | Προετοιμασία και φροντίδα από τον ψυχολόγο σας | **Ρητή συγκατάθεση, άρθ. 9(2)(α)**· υγειονομική περίθαλψη, άρθ. 9(2)(η) |
| Άδεια άσκησης και ταυτότητα ψυχολόγων | Έλεγχος ότι κάθε ψυχολόγος έχει άδεια | Έννομο συμφέρον, άρθ. 6(1)(στ)· νομική υποχρέωση |
| Αρχεία ασφαλείας (συνδέσεις, πρόσβαση σε αρχεία) | Προστασία λογαριασμών και ευαίσθητων δεδομένων | Έννομο συμφέρον, άρθ. 6(1)(στ)· άρθ. 32 |
| Αναζητήσεις (χωρίς σύνδεση με λογαριασμό) | Βελτίωση αναζήτησης | Έννομο συμφέρον, άρθ. 6(1)(στ) |

Οι πληροφορίες υγείας είναι **ειδική κατηγορία** δεδομένων. Ζητάμε ρητή συγκατάθεση κατά την εγγραφή, μπορείτε να την ανακαλέσετε οποιαδήποτε στιγμή από *Λογαριασμός > Απόρρητο*, και συλλέγουμε μόνο ό,τι χρειάζεται (ελαχιστοποίηση δεδομένων).

Δεν πουλάμε δεδομένα, δεν χρησιμοποιούμε διαφημιστικούς ιχνηλάτες και δεν χρησιμοποιούμε πληροφορίες υγείας για marketing ή εκπαίδευση μοντέλων τεχνητής νοημοσύνης.

## Πώς τα προστατεύουμε

- Μηνύματα, απαντήσεις εισαγωγής, σημειώσεις συνεδριών, ΑΦΜ και τραπεζικά στοιχεία αποθηκεύονται **κρυπτογραφημένα** (AES-256-GCM)· κάθε σύνδεση χρησιμοποιεί **TLS**.
- Πρόσβαση βάσει ρόλου: ο ψυχολόγος βλέπει μόνο τους δικούς του πελάτες.
- Κάθε πρόσβαση σε ευαίσθητα αρχεία καταγράφεται σε **αρχείο ελέγχου**.
- Έλεγχος ταυτότητας δύο παραγόντων είναι υποχρεωτικός για ψυχολόγους και προσωπικό.
- Τα στοιχεία κάρτας εισάγονται στη σελίδα του παρόχου πληρωμών· **δεν βλέπουμε ούτε αποθηκεύουμε αριθμούς καρτών**.

## Πού αποθηκεύονται

Όλα τα δεδομένα αποθηκεύονται και επεξεργάζονται στην **Ευρωπαϊκή Ένωση**:

| Εκτελών | Σκοπός | Τοποθεσία |
|---|---|---|
| [Πάροχος φιλοξενίας] | Φιλοξενία εφαρμογής | [Περιοχή ΕΕ, π.χ. Φρανκφούρτη] |
| [Πάροχος βάσης δεδομένων] | Βάση δεδομένων και αντίγραφα | [Περιοχή ΕΕ] |
| [Πάροχος αποθήκευσης αρχείων] | Έγγραφα | [Περιοχή ΕΕ] |
| Stripe Payments Europe Ltd. | Πληρωμές με κάρτα | Ιρλανδία (ΕΕ) |
| [Πάροχος email] | Emails | [Περιοχή ΕΕ] |
| [Πάροχος SMS] | Υπενθυμίσεις SMS | [Περιοχή ΕΕ] |
| [Πάροχος βίντεο, αν ενεργός] | Βιντεοκλήσεις | [Περιοχή ΕΕ· στο peer-to-peer βίντεο η εικόνα πηγαίνει απευθείας μεταξύ των συμμετεχόντων] |

Αν κάποιος πάροχος διαβιβάζει δεδομένα εκτός ΕΟΧ, βασιζόμαστε σε απόφαση επάρκειας ή Τυποποιημένες Συμβατικές Ρήτρες με πρόσθετες εγγυήσεις. [Καταγράψτε τυχόν διαβιβάσεις.]

Οι χάρτες φορτώνονται από το OpenStreetMap μόνο αν το επιτρέψετε (δείτε την [Πολιτική cookies](/el/p/cookies)).

## Πόσο τα κρατάμε

| Δεδομένα | Διατήρηση |
|---|---|
| Λογαριασμός | Όσο είναι ανοιχτός· διαγράφεται ή ανωνυμοποιείται με τη διαγραφή |
| Μηνύματα, απαντήσεις εισαγωγής | Διαγράφονται με τη διαγραφή λογαριασμού |
| Σημειώσεις συνεδριών | Τις τηρεί ο ψυχολόγος για όσο ορίζουν οι επαγγελματικοί κανόνες [επιβεβαιώστε] |
| Αποδείξεις και τιμολόγια | Όσο ορίζει η φορολογική νομοθεσία [τουλάχιστον 5 έτη] |
| Μη πληρωμένες κρατήσεις με κάρτα | Αποδεσμεύονται μετά από 30 λεπτά |
| Αρχεία αναζητήσεων | 13 μήνες |
| Αρχεία ειδοποιήσεων | 12 μήνες |
| Αρχεία ασφαλείας και ελέγχου | [Χ έτη] |

## Τα δικαιώματά σας

Έχετε δικαίωμα πρόσβασης, διόρθωσης, φορητότητας, περιορισμού, εναντίωσης και διαγραφής, καθώς και ανάκλησης της συγκατάθεσης. Τα περισσότερα γίνονται από *Λογαριασμός > Απόρρητο* (εξαγωγή δεδομένων σε αρχείο, διαγραφή λογαριασμού). Για οτιδήποτε άλλο γράψτε στο [privacy@example.com]· απαντάμε εντός ενός μήνα.

Μπορείτε επίσης να υποβάλετε καταγγελία στην **Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα** (www.dpa.gr, Λ. Κηφισίας 1-3, 115 23 Αθήνα).

## Αλλαγές

Θα σας ενημερώνουμε για ουσιώδεις αλλαγές με email και θα ζητάμε ξανά συγκατάθεση όπου το απαιτεί ο νόμος.
`;

const termsEn = `${n.en}

*Version 2026-11.*

## 1. The service

[Company legal name] runs an online platform that helps you find, compare and book sessions with independent, licensed psychologists. We verify each psychologist's licence, but **the psychologist alone provides the professional service** and is responsible for it.

**This is not an emergency service.** If you or someone else is in danger, call **112** or the suicide prevention line **1018**. See [Urgent help](/en/urgent-help).

## 2. Your account

You must be at least 18 [or have a guardian's consent: confirm]. Keep your password secret and tell us about any misuse. One account per person.

## 3. Booking and paying

- Prices are per session, in euros, and include any VAT that applies [psychological services are usually VAT-exempt: confirm].
- You can pay **at the session** or, where offered, **by card online**. Card payments go through Stripe with Strong Customer Authentication (3-D Secure); we never store card details.
- Some psychologists confirm requests first: your card is then only authorised, and charged when they accept.
- Receipts are issued by the psychologist.

## 4. Cancelling

The [Cancellation and refund policy](/en/p/cancellation-policy) applies, together with each psychologist's notice period shown on their profile and at booking.

## 5. Acceptable use

Don't misuse the platform: no false information, harassment, attempts to access other people's data, or using the messaging for anything other than arranging care.

## 6. Feedback

Feedback is private by default and shared only with the psychologist. It is published only with your explicit consent and after moderation.

## 7. Liability

We are responsible for running the platform with reasonable care. We are not responsible for the content of the psychological services, which is the psychologist's professional responsibility. Nothing in these terms limits liability that cannot be limited by law.

## 8. Ending your account

You can delete your account at any time in *Account > Privacy*. We may suspend accounts that breach these terms.

## 9. Law and disputes

Greek law applies; your rights as an EU consumer are not affected. You can contact us at [support@example.com] or use the EU's online dispute resolution platform.
`;

const termsEl = `${n.el}

*Έκδοση 2026-11.*

## 1. Η υπηρεσία

Η [επωνυμία εταιρείας] λειτουργεί διαδικτυακή πλατφόρμα που σας βοηθά να βρείτε, να συγκρίνετε και να κλείσετε συνεδρίες με ανεξάρτητους, αδειοδοτημένους ψυχολόγους. Ελέγχουμε την άδεια κάθε ψυχολόγου, αλλά **την επαγγελματική υπηρεσία την παρέχει αποκλειστικά ο ψυχολόγος**, ο οποίος ευθύνεται γι' αυτήν.

**Δεν είμαστε υπηρεσία επειγόντων.** Αν εσείς ή κάποιος άλλος κινδυνεύει, καλέστε το **112** ή τη γραμμή πρόληψης αυτοκτονίας **1018**. Δείτε [Άμεση βοήθεια](/el/urgent-help).

## 2. Ο λογαριασμός σας

Πρέπει να είστε τουλάχιστον 18 ετών [ή με συναίνεση κηδεμόνα: επιβεβαιώστε]. Κρατήστε τον κωδικό σας μυστικό. Ένας λογαριασμός ανά άτομο.

## 3. Κράτηση και πληρωμή

- Οι τιμές είναι ανά συνεδρία, σε ευρώ, και περιλαμβάνουν τυχόν ΦΠΑ [οι υπηρεσίες ψυχολόγου συνήθως απαλλάσσονται: επιβεβαιώστε].
- Πληρώνετε **στη συνεδρία** ή, όπου προσφέρεται, **με κάρτα online**. Οι πληρωμές με κάρτα γίνονται μέσω Stripe με ισχυρή ταυτοποίηση πελάτη (3-D Secure)· δεν αποθηκεύουμε στοιχεία κάρτας.
- Ορισμένοι ψυχολόγοι επιβεβαιώνουν πρώτα τα αιτήματα: η κάρτα τότε μόνο εγκρίνεται και χρεώνεται όταν αποδεχτούν.
- Τις αποδείξεις εκδίδει ο ψυχολόγος.

## 4. Ακυρώσεις

Ισχύει η [Πολιτική ακυρώσεων και επιστροφών](/el/p/cancellation-policy), μαζί με την προθεσμία κάθε ψυχολόγου που εμφανίζεται στο προφίλ και κατά την κράτηση.

## 5. Αποδεκτή χρήση

Μην κάνετε κατάχρηση της πλατφόρμας: όχι ψευδή στοιχεία, παρενόχληση, απόπειρες πρόσβασης σε δεδομένα άλλων ή χρήση των μηνυμάτων για άλλο σκοπό πέρα από τη φροντίδα σας.

## 6. Σχόλια

Τα σχόλια είναι ιδιωτικά από προεπιλογή και τα βλέπει μόνο ο ψυχολόγος. Δημοσιεύονται μόνο με ρητή συγκατάθεσή σας και μετά από έλεγχο.

## 7. Ευθύνη

Ευθυνόμαστε για τη λειτουργία της πλατφόρμας με εύλογη επιμέλεια. Δεν ευθυνόμαστε για το περιεχόμενο των ψυχολογικών υπηρεσιών, που αποτελεί επαγγελματική ευθύνη του ψυχολόγου. Οι όροι δεν περιορίζουν ευθύνη που δεν μπορεί να περιοριστεί κατά νόμο.

## 8. Λήξη λογαριασμού

Μπορείτε να διαγράψετε τον λογαριασμό σας οποιαδήποτε στιγμή από *Λογαριασμός > Απόρρητο*. Μπορούμε να αναστείλουμε λογαριασμούς που παραβιάζουν τους όρους.

## 9. Δίκαιο και διαφορές

Ισχύει το ελληνικό δίκαιο· τα δικαιώματά σας ως καταναλωτή στην ΕΕ δεν θίγονται. Επικοινωνήστε στο [support@example.com] ή μέσω της ευρωπαϊκής πλατφόρμας επίλυσης διαφορών.
`;

const cancelEn = `${n.en}

*Version 2026-11.*

## Cancelling or moving a session

- **Free cancellation** until the psychologist's notice period, shown on their profile and at booking (24 hours unless they set another). Cancel or reschedule from *Account > Appointments*.
- **Late cancellation** (inside the notice period): the psychologist may charge the late-cancellation fee shown on their profile (a percentage of the session price, up to 100%).
- **Missed session** (no-show without cancelling): the full price may be charged.
- **Intro calls** are free and can always be cancelled.

## If the psychologist cancels

You are never charged for a session the psychologist cancels or declines. Card payments are refunded in full and card authorisations are released.

## Card refunds

- Free cancellation: full refund to the original card.
- Late cancellation: refund of the price minus the late-cancellation fee.
- Refunds usually reach your account within 5–10 business days, depending on your bank.
- Booking requests that are declined: the authorisation is released and you are not charged.

## Problems with a session

If something went wrong (for example a technical problem with a video session), write to [support@example.com] within 14 days. We review every case and may refund at our discretion.

## Withdrawal right

[Health services are excluded from the EU 14-day withdrawal right under Directive 2011/83/EU, Art. 3(3)(b); this policy applies instead. Legal counsel to confirm.]
`;

const cancelEl = `${n.el}

*Έκδοση 2026-11.*

## Ακύρωση ή αλλαγή συνεδρίας

- **Δωρεάν ακύρωση** έως την προθεσμία του ψυχολόγου, που εμφανίζεται στο προφίλ και κατά την κράτηση (24 ώρες, εκτός αν ορίσει άλλη). Ακυρώστε ή αλλάξτε ώρα από *Λογαριασμός > Ραντεβού*.
- **Καθυστερημένη ακύρωση** (εντός της προθεσμίας): ο ψυχολόγος μπορεί να χρεώσει το τέλος που εμφανίζεται στο προφίλ του (ποσοστό της τιμής, έως 100%).
- **Μη προσέλευση** χωρίς ακύρωση: μπορεί να χρεωθεί ολόκληρη η τιμή.
- Οι **κλήσεις γνωριμίας** είναι δωρεάν και ακυρώνονται πάντα.

## Αν ακυρώσει ο ψυχολόγος

Δεν χρεώνεστε ποτέ για συνεδρία που ακυρώνει ή απορρίπτει ο ψυχολόγος. Οι πληρωμές με κάρτα επιστρέφονται πλήρως και οι εγκρίσεις κάρτας αποδεσμεύονται.

## Επιστροφές στην κάρτα

- Δωρεάν ακύρωση: πλήρης επιστροφή στην αρχική κάρτα.
- Καθυστερημένη ακύρωση: επιστροφή της τιμής μείον το τέλος ακύρωσης.
- Οι επιστροφές συνήθως εμφανίζονται σε 5–10 εργάσιμες, ανάλογα με την τράπεζά σας.
- Αιτήματα που απορρίπτονται: η έγκριση αποδεσμεύεται και δεν χρεώνεστε.

## Πρόβλημα με μια συνεδρία

Αν κάτι πήγε στραβά (π.χ. τεχνικό πρόβλημα σε βιντεοκλήση), γράψτε στο [support@example.com] εντός 14 ημερών. Εξετάζουμε κάθε περίπτωση και μπορεί να κάνουμε επιστροφή κατά την κρίση μας.

## Δικαίωμα υπαναχώρησης

[Οι υπηρεσίες υγείας εξαιρούνται από το 14ήμερο δικαίωμα υπαναχώρησης της Οδηγίας 2011/83/ΕΕ, άρθ. 3(3)(β)· ισχύει η παρούσα πολιτική. Προς επιβεβαίωση από νομικό σύμβουλο.]
`;

const proEn = `${n.en}

*Version 2026-11.*

## 1. Who can join

Psychologists holding a valid licence to practise in Greece [or another EU country where they offer sessions], with professional indemnity insurance [confirm requirement]. You remain an **independent professional**; nothing here creates employment.

## 2. Verification and profile

- Your profile is hidden until we verify your licence and identity documents.
- Keep your licence, qualifications, prices and availability accurate. Tell us at once if your licence is suspended or withdrawn.
- No claims of guaranteed results, and no public testimonials unless the client consented and we moderated them.

## 3. Professional responsibility

You alone are responsible for the services you provide, for following the professional code of ethics, and for your own crisis protocol. Use the platform's risk indicators as a prompt, not a substitute for professional judgment.

## 4. Fees and payments

- Your subscription plan and commission are shown in *Workspace > Plan*. Changes are announced [30] days in advance.
- Card payments are collected through Stripe and paid out to your IBAN [payout schedule], minus commission and refunds.
- You issue receipts and are responsible for tax obligations, including myDATA.
- Clients are refunded in full when you cancel or decline.

## 5. Cancellations

You set your notice period and late-cancellation fee (within the platform's limits). Cancel sessions only with good reason and as early as possible.

## 6. Data protection (Art. 28 GDPR agreement)

- For your clinical records on the platform (session notes, documents) **you are the controller and we are your processor**. We process them only on your instructions, keep them confidential and encrypted, and help you respond to client requests.
- Approved sub-processors and their EU locations are listed in the [Privacy policy](/en/p/privacy). We'll notify you [30] days before adding one, and you may object.
- We report personal data breaches to you without undue delay (within 48 hours of becoming aware).
- On termination you can export your records; we delete them after [90] days unless the law requires otherwise.
- You must keep client data confidential, use two-factor authentication, and not export client data to unsecured tools.

## 7. Suspension and termination

Either side may end the agreement with [30] days' notice. We may suspend a profile immediately for loss of licence, serious complaints, or breach of these terms.

## 8. Liability and law

Each party is liable for its own obligations. Greek law applies; courts of [Athens] have jurisdiction.
`;

const proEl = `${n.el}

*Έκδοση 2026-11.*

## 1. Ποιοι μπορούν να συμμετέχουν

Ψυχολόγοι με ισχύουσα άδεια άσκησης επαγγέλματος στην Ελλάδα [ή σε άλλη χώρα της ΕΕ όπου προσφέρουν συνεδρίες], με ασφάλιση επαγγελματικής ευθύνης [επιβεβαιώστε]. Παραμένετε **ανεξάρτητος επαγγελματίας**· οι όροι δεν δημιουργούν σχέση εργασίας.

## 2. Έλεγχος και προφίλ

- Το προφίλ σας είναι κρυφό μέχρι να ελέγξουμε την άδεια και τα έγγραφα ταυτότητας.
- Διατηρείτε ακριβή την άδεια, τα προσόντα, τις τιμές και τη διαθεσιμότητα. Ενημερώστε μας αμέσως αν η άδειά σας ανασταλεί ή ανακληθεί.
- Όχι υποσχέσεις εγγυημένων αποτελεσμάτων και όχι δημόσιες μαρτυρίες χωρίς συγκατάθεση του πελάτη και έλεγχο.

## 3. Επαγγελματική ευθύνη

Είστε αποκλειστικά υπεύθυνος για τις υπηρεσίες σας, την τήρηση του κώδικα δεοντολογίας και το δικό σας πρωτόκολλο κρίσεων. Οι ενδείξεις κινδύνου της πλατφόρμας είναι βοήθημα, όχι υποκατάστατο της επαγγελματικής κρίσης.

## 4. Χρεώσεις και πληρωμές

- Το πρόγραμμα συνδρομής και η προμήθεια εμφανίζονται στο *Χώρος εργασίας > Πρόγραμμα*. Αλλαγές ανακοινώνονται [30] ημέρες νωρίτερα.
- Οι πληρωμές με κάρτα εισπράττονται μέσω Stripe και αποδίδονται στο IBAN σας [συχνότητα], μείον προμήθεια και επιστροφές.
- Εκδίδετε εσείς τις αποδείξεις και ευθύνεστε για τις φορολογικές υποχρεώσεις, συμπεριλαμβανομένου του myDATA.
- Ο πελάτης λαμβάνει πλήρη επιστροφή όταν ακυρώνετε ή απορρίπτετε.

## 5. Ακυρώσεις

Ορίζετε την προθεσμία ακύρωσης και το τέλος καθυστερημένης ακύρωσης (εντός των ορίων της πλατφόρμας). Ακυρώνετε μόνο για σοβαρό λόγο και όσο νωρίτερα γίνεται.

## 6. Προστασία δεδομένων (σύμβαση άρθ. 28 ΓΚΠΔ)

- Για το κλινικό σας αρχείο στην πλατφόρμα (σημειώσεις, έγγραφα) **είστε υπεύθυνος επεξεργασίας και εμείς εκτελούντες**. Τα επεξεργαζόμαστε μόνο με εντολή σας, εμπιστευτικά και κρυπτογραφημένα, και σας βοηθάμε να απαντάτε σε αιτήματα πελατών.
- Οι εγκεκριμένοι υπο-εκτελούντες και οι τοποθεσίες τους στην ΕΕ αναφέρονται στην [Πολιτική απορρήτου](/el/p/privacy). Σας ενημερώνουμε [30] ημέρες πριν προσθέσουμε νέο και μπορείτε να αντιταχθείτε.
- Σας ειδοποιούμε για παραβίαση δεδομένων χωρίς αδικαιολόγητη καθυστέρηση (εντός 48 ωρών από τη γνώση της).
- Με τη λήξη μπορείτε να εξαγάγετε το αρχείο σας· το διαγράφουμε μετά από [90] ημέρες, εκτός αν ο νόμος ορίζει αλλιώς.
- Οφείλετε να τηρείτε το απόρρητο, να χρησιμοποιείτε έλεγχο δύο παραγόντων και να μη μεταφέρετε δεδομένα πελατών σε μη ασφαλή εργαλεία.

## 7. Αναστολή και λήξη

Κάθε μέρος μπορεί να λύσει τη σύμβαση με προειδοποίηση [30] ημερών. Μπορούμε να αναστείλουμε άμεσα προφίλ σε περίπτωση απώλειας άδειας, σοβαρών καταγγελιών ή παραβίασης των όρων.

## 8. Ευθύνη και δίκαιο

Κάθε μέρος ευθύνεται για τις δικές του υποχρεώσεις. Ισχύει το ελληνικό δίκαιο· αρμόδια τα δικαστήρια [Αθηνών].
`;

const cookiesEn = `${n.en}

*Version 2026-11.*

## Essential cookies (always on)

| Cookie | Purpose | Duration |
|---|---|---|
| session | Keeps you signed in (httpOnly, secure) | 30 days |
| pending_2fa | Completes two-factor sign-in | 5 minutes |
| NEXT_LOCALE | Remembers your language | 1 year |
| cookie_consent | Remembers your choice below | 1 year |

## Optional third-party content (only with your consent)

- **Maps** (OpenStreetMap tiles): the map server receives your IP address.
- **Embedded videos** on psychologist profiles (YouTube no-cookie / Vimeo): load only when you press play.

We don't use advertising or analytics cookies. You can change your choice any time in *Account > Privacy*, or by clearing cookies for this site.
`;

const cookiesEl = `${n.el}

*Έκδοση 2026-11.*

## Απαραίτητα cookies (πάντα ενεργά)

| Cookie | Σκοπός | Διάρκεια |
|---|---|---|
| session | Σας κρατά συνδεδεμένους (httpOnly, secure) | 30 ημέρες |
| pending_2fa | Ολοκληρώνει τη σύνδεση δύο παραγόντων | 5 λεπτά |
| NEXT_LOCALE | Θυμάται τη γλώσσα σας | 1 έτος |
| cookie_consent | Θυμάται την επιλογή σας παρακάτω | 1 έτος |

## Προαιρετικό περιεχόμενο τρίτων (μόνο με συγκατάθεση)

- **Χάρτες** (OpenStreetMap): ο διακομιστής χαρτών λαμβάνει τη διεύθυνση IP σας.
- **Ενσωματωμένα βίντεο** στα προφίλ (YouTube no-cookie / Vimeo): φορτώνουν μόνο όταν πατήσετε αναπαραγωγή.

Δεν χρησιμοποιούμε cookies διαφήμισης ή στατιστικών. Μπορείτε να αλλάξετε την επιλογή σας από *Λογαριασμός > Απόρρητο* ή διαγράφοντας τα cookies του ιστότοπου.
`;

export const legalContent: SeedContent[] = [
  { kind: "page", slug: "privacy", el: { title: "Πολιτική απορρήτου", body: privacyEl }, en: { title: "Privacy policy", body: privacyEn } },
  { kind: "page", slug: "terms", el: { title: "Όροι χρήσης", body: termsEl }, en: { title: "Terms of use", body: termsEn } },
  { kind: "page", slug: "terms-psychologists", el: { title: "Όροι για ψυχολόγους", body: proEl }, en: { title: "Terms for psychologists", body: proEn } },
  { kind: "page", slug: "cancellation-policy", el: { title: "Πολιτική ακυρώσεων και επιστροφών", body: cancelEl }, en: { title: "Cancellation and refund policy", body: cancelEn } },
  { kind: "page", slug: "cookies", el: { title: "Πολιτική cookies", body: cookiesEl }, en: { title: "Cookie policy", body: cookiesEn } },
];

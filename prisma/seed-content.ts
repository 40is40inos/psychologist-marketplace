/**
 * Starter CMS content. Legal page templates live in seed-legal.ts.
 */
type T = { title: string; excerpt?: string; body: string };
export interface SeedContent {
  kind: "article" | "page";
  slug: string;
  el: T;
  en: T;
}


export const content: SeedContent[] = [
  {
    kind: "page",
    slug: "about",
    el: {
      title: "Σχετικά με εμάς",
      body: "Βοηθάμε ανθρώπους να βρουν τον κατάλληλο ψυχολόγο, με σαφείς πληροφορίες για προσέγγιση, τιμές και διαθεσιμότητα.\n\n## Πώς επιλέγουμε τους ψυχολόγους\n\nΚάθε ψυχολόγος ελέγχεται από την ομάδα μας: επιβεβαιώνουμε την άδεια άσκησης επαγγέλματος πριν δημοσιευτεί το προφίλ.\n\n## Επικοινωνία\n\nΓια ερωτήσεις γράψτε μας στο [support@example.com](mailto:support@example.com).",
    },
    en: {
      title: "About us",
      body: "We help people find the right psychologist, with clear information about approach, prices and availability.\n\n## How psychologists are vetted\n\nOur team checks every psychologist's license to practise before their profile goes live.\n\n## Contact\n\nQuestions? Write to [support@example.com](mailto:support@example.com).",
    },
  },
  {
    kind: "article",
    slug: "how-to-choose-a-psychologist",
    el: {
      title: "Πώς να επιλέξετε ψυχολόγο",
      excerpt: "Πέντε πρακτικά ερωτήματα που βοηθούν να βρείτε κάποιον που σας ταιριάζει.",
      body: "Η σχέση με τον θεραπευτή είναι από τους πιο σημαντικούς παράγοντες για το αποτέλεσμα της θεραπείας. Μερικά ερωτήματα που βοηθούν:\n\n1. Έχει εμπειρία με αυτό που με απασχολεί;\n2. Ποια προσέγγιση χρησιμοποιεί και μου ταιριάζει;\n3. Προτιμώ συνεδρίες δια ζώσης ή διαδικτυακά;\n4. Ποιο είναι το κόστος και πόσο συχνά θα συναντιόμαστε;\n5. Νιώθω άνετα μετά την πρώτη συνάντηση;\n\n## Η πρώτη συνάντηση\n\nΠολλοί ψυχολόγοι προσφέρουν **δωρεάν κλήση γνωριμίας 15 λεπτών**. Είναι μια καλή ευκαιρία να κάνετε ερωτήσεις πριν αποφασίσετε.",
    },
    en: {
      title: "How to choose a psychologist",
      excerpt: "Five practical questions that help you find someone who fits.",
      body: "The relationship with your therapist is one of the strongest predictors of how well therapy works. A few questions that help:\n\n1. Do they have experience with what I'm going through?\n2. Which approach do they use, and does it suit me?\n3. Do I prefer in-person or online sessions?\n4. What does it cost, and how often would we meet?\n5. Do I feel comfortable after the first meeting?\n\n## The first meeting\n\nMany psychologists offer a **free 15-minute intro call**. It's a good chance to ask questions before you decide.",
    },
  },
];

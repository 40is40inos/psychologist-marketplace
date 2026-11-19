/** Topics on the contact form (labels in the dictionaries under contactPage.topics). */
export const CONTACT_TOPICS = ["general", "booking", "payment", "account", "psychologist", "press"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

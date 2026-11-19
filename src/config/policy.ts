/**
 * Clinical-ethics policy switches.
 *
 * Many psychologist codes of ethics discourage public client testimonials,
 * so feedback is private by default: only the psychologist (without the
 * client's name) and the platform's quality team can read it. Profiles show
 * aggregated, non-identifying indicators instead.
 *
 * Set PUBLIC_TESTIMONIALS=true only after legal/ethics review for the market.
 */
export const policy = {
  publicTestimonials: process.env.PUBLIC_TESTIMONIALS === "true",
  /** Minimum data before an indicator is shown, so no single client can be inferred. */
  minSessionsForIndicator: 10,
  minRepliesForIndicator: 5,
  indicatorWindowDays: 90,
} as const;

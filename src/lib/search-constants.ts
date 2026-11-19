/** Shared with client components (search.ts is server-only). */
export const SORTS = ["relevance", "earliest", "price_low", "price_high"] as const;
export const AVAILABILITY_WINDOWS = ["today", "week", "2weeks"] as const;

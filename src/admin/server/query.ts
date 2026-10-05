import "server-only";

/** A `%…%` pattern for ILIKE with the user's `%`, `_` and `\` taken literally. */
export const likePattern = (value: string) => `%${value.replace(/[\\%_]/g, "\\$&")}%`;

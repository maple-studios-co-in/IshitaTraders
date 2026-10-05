/** URL slugs: lowercase letters, digits and single hyphens. */
export function slugify(value: string, maxLength = 80) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isValidSlug = (value: string) => SLUG_PATTERN.test(value) && value.length <= 80;

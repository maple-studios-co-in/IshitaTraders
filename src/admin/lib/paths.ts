/**
 * Request-path helpers shared by the redirects manager and the public catch-all route
 * (client-safe, no I/O).
 */

/**
 * The form used to match a request path against redirect sources and page slugs: decoded,
 * lower-case, without query/fragment, duplicate or trailing slashes. `/Old-Page/?a=1` → `/old-page`.
 */
export function normalizePath(value: string): string {
  let path = value.trim().replace(/[?#].*$/, "");
  try {
    // decodeURI keeps reserved characters (%2F, %3F…) encoded, so `/a%2Fb` stays distinct from `/a/b`.
    path = decodeURI(path);
  } catch {
    // Malformed escapes: match on the raw text.
  }
  path = path.toLowerCase().replace(/\/{2,}/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path || "/";
}

/** Whether a string contains whitespace or control characters (never valid in a URL we store). */
export function hasUnsafeCharacters(value: string) {
  return /[\s\u0000-\u001f\u007f]/.test(value);
}

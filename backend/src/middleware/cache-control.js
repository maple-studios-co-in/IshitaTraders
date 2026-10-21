/**
 * Cache-Control headers. Public catalogue data can be cached briefly by browsers and CDNs (and
 * served slightly stale while it refreshes); anything private or changing must never be cached.
 */
export const publicCache =
  (maxAgeSeconds = 60) =>
  (_req, res, next) => {
    res.set("Cache-Control", `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 5}`);
    next();
  };

export const noStore = (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
};

import "server-only";

import { getCatalog } from "@/admin/content/catalog";
import { getFaqs, getRoutingTable, getTestimonials } from "@/admin/content/content";
import { getSiteSettings } from "@/admin/content/settings";
import { formatBytes, pluralize } from "@/admin/lib/format";
import { siteConfig } from "@/config/site";

import { linksWithRel, metaContent, parseHtml, type ParsedHtml } from "./audit-html";
import {
  auditCategories,
  issuePenalty,
  severityRank,
  type AuditCategory,
  type AuditCategoryResult,
  type AuditFix,
  type AuditIssue,
  type AuditPageResult,
  type AuditPassedCheck,
  type AuditReport,
} from "./audit-types";

/**
 * The SEO audit: crawls the public site over HTTP the way a search engine does (homepage, products,
 * uploaded pages, robots.txt, sitemap, internal links) and checks the content managed in the admin
 * (catalogue, testimonials, FAQs, settings). Pure read-only work: nothing is written here; the
 * caller stores the report.
 */

/** Link checks stop being scheduled once the audit has run this long. */
const BUDGET_MS = 20_000;
/** …but they always get at least this long after the crawl (a slow first compile in dev). */
const MIN_LINK_WINDOW_MS = 3_000;
const PAGE_TIMEOUT_MS = 15_000;
const FILE_TIMEOUT_MS = 10_000;
const LINK_TIMEOUT_MS = 6_000;
const MAX_PAGES = 30;
const MAX_LINK_CHECKS = 40;
const MAX_SITEMAP_CHECKS = 30;
const PAGE_CONCURRENCY = 4;
const LINK_CONCURRENCY = 6;
const MAX_HTML_BYTES = 4 * 1024 * 1024;
const MAX_FILE_BYTES = 1024 * 1024;
/** Says "bot" so the site never counts audit requests as page views (see site/serve-path.ts). */
const USER_AGENT = "Mozilla/5.0 (compatible; IshitaTradersSeoAuditBot/1.0)";

const TITLE_RANGE = { min: 30, max: 65 };
const DESCRIPTION_RANGE = { min: 70, max: 160 };
/** Repeats of one rule add half a penalty each, up to 3× (twenty products without photos ≠ score 0). */
const REPEAT_FACTOR = 0.5;
const REPEAT_CAP = 3;
/** Category scores react more strongly than the overall score (one error ≈ −25 in its area). */
const CATEGORY_SENSITIVITY = 2.5;

const fixes = {
  seo: { label: "Open SEO settings", href: "/admin/seo" },
  content: { label: "Open site content", href: "/admin/content" },
  testimonials: { label: "Edit testimonials", href: "/admin/testimonials" },
  faqs: { label: "Edit FAQs", href: "/admin/faqs" },
  catalogue: { label: "Edit brands & categories", href: "/admin/catalogue" },
  products: { label: "Open products", href: "/admin/products" },
  product: (id: string): AuditFix | undefined =>
    id.startsWith("seed:") ? undefined : { label: "Edit product", href: `/admin/products/${encodeURIComponent(id)}` },
  page: (id: string): AuditFix => ({ label: "Edit page", href: `/admin/pages/${encodeURIComponent(id)}` }),
} satisfies Record<string, AuditFix | ((id: string) => AuditFix | undefined)>;

/* ------------------------------------------------------------------ types */

type PageSource = { kind: "route" } | { kind: "html-page"; id: string; noindex: boolean } | { kind: "sitemap" };

interface CrawlTarget {
  path: string;
  label: string;
  source: PageSource;
}

interface CrawledPage {
  target: CrawlTarget;
  url: string;
  status: number | null;
  error?: string;
  finalUrl: string;
  timeMs: number;
  bytes: number;
  truncated: boolean;
  contentType: string;
  robotsHeader: string;
  parsed: ParsedHtml | null;
}

interface TextFile {
  status: number | null;
  ok: boolean;
  error?: string;
  text: string;
  contentType: string;
}

interface ProbeJob {
  kind: "link" | "sitemap" | "share-image";
  url: string;
  path: string;
  foundOn?: string;
}

interface ProbeOutcome {
  job: ProbeJob;
  skipped: boolean;
  status: number | null;
  error?: string;
  timedOut?: boolean;
}

type NewIssue = Omit<AuditIssue, "id"> & { key?: string };

class Findings {
  readonly issues: AuditIssue[] = [];
  readonly passed: AuditPassedCheck[] = [];
  private readonly ids = new Set<string>();

  add({ key, ...issue }: NewIssue) {
    const id = [issue.rule, key ?? issue.url].filter(Boolean).join(":");
    if (this.ids.has(id)) return;
    this.ids.add(id);
    this.issues.push({ id, ...issue });
  }

  has(...rules: string[]) {
    return this.issues.some((issue) => rules.includes(issue.rule));
  }

  pass(id: string, category: AuditCategory, title: string, detail?: string) {
    this.passed.push({ id, category, title, detail });
  }

  /** Records a passed check when none of `rules` raised an issue. */
  passIfClean(rules: string[], category: AuditCategory, title: string, detail?: string) {
    if (!this.has(...rules)) this.pass(rules[0], category, title, detail);
  }
}

/* ------------------------------------------------------------------- main */

export async function runSeoAudit(origin: string, options: { runBy?: string } = {}): Promise<AuditReport> {
  const started = Date.now();
  const site = new URL(origin).origin;
  const environment = process.env.NODE_ENV === "production" ? "production" : "development";
  /** The audited origin, plus the configured public URL (they differ when auditing a local copy). */
  const knownOrigins = new Set([site, safeOrigin(siteConfig.url) ?? site]);
  const findings = new Findings();

  const [settings, catalog, testimonials, faqs, routing, robots, sitemapFile] = await Promise.all([
    getSiteSettings(),
    getCatalog(),
    getTestimonials(),
    getFaqs(),
    getRoutingTable(),
    fetchTextFile(`${site}/robots.txt`, "text/plain,*/*;q=0.8"),
    fetchTextFile(`${site}/sitemap.xml`, "application/xml,text/xml;q=0.9,*/*;q=0.8"),
  ]);
  const sitemap = await readSitemap(sitemapFile, site, knownOrigins);
  const indexingAllowed = settings.seo.allowIndexing;

  /* ---- crawl ---- */

  const targets: CrawlTarget[] = [];
  const addTarget = (path: string, label: string, source: PageSource) => {
    if (!targets.some((target) => samePath(target.path, path))) targets.push({ path, label, source });
  };
  addTarget("/", "Homepage", { kind: "route" });
  addTarget("/products", "Products", { kind: "route" });
  for (const page of routing.pages) {
    addTarget(`/${page.slug.replace(/^\/+/, "")}`, "Uploaded page", {
      kind: "html-page",
      id: page.id,
      noindex: page.noindex,
    });
  }
  for (const path of sitemap.paths) if (looksLikePage(path)) addTarget(path, "Sitemap page", { kind: "sitemap" });
  const crawled = await mapLimit(targets.slice(0, MAX_PAGES), PAGE_CONCURRENCY, (target) => crawlPage(site, target));
  const crawledPaths = new Set(crawled.map((page) => normalizePath(page.target.path)));

  /* ---- per-page checks ---- */

  const context: PageContext = { site, knownOrigins, findings, environment, indexingAllowed, seo: settings.seo };
  const pageResults = crawled.map((page) => analysePage(page, context));
  const analysed = crawled.filter((page) => page.parsed && page.status !== null && page.status < 400);
  const fixForPath = (path: string) => {
    const source = targets.find((target) => target.path === path)?.source;
    return source?.kind === "html-page" ? fixes.page(source.id) : undefined;
  };
  checkDuplicates(pageResults, findings, fixForPath);

  if (targets.length > MAX_PAGES) {
    findings.add({
      rule: "technical.crawl-limit",
      severity: "notice",
      category: "Technical",
      title: `Only the first ${MAX_PAGES} of ${targets.length} pages were audited`,
      detail: "The audit stops at a fixed number of pages to finish quickly. The rest were not checked this time.",
    });
  }

  /* ---- links, sitemap URLs and share images ---- */

  const jobs: ProbeJob[] = [];
  const queued = new Set<string>();
  const enqueue = (job: ProbeJob, limit: number) => {
    const key = `${job.kind}:${job.url}`;
    if (queued.has(key) || jobs.filter((other) => other.kind === job.kind).length >= limit) return false;
    queued.add(key);
    jobs.push(job);
    return true;
  };
  for (const page of analysed) {
    const image = metaContent(page.parsed!.metas, "og:image")?.trim();
    const resolved = image ? toSiteUrl(image, page.finalUrl, site, knownOrigins) : null;
    if (resolved)
      enqueue({ kind: "share-image", url: resolved.url, path: resolved.path, foundOn: page.target.path }, 5);
  }
  for (const path of sitemap.paths) {
    if (!crawledPaths.has(normalizePath(path)))
      enqueue({ kind: "sitemap", url: `${site}${path}`, path }, MAX_SITEMAP_CHECKS);
  }
  // Round-robin across pages, so the link budget covers every page instead of the first long one.
  const linksByPage = analysed.map((page) => ({ page, links: internalHrefs(page, site, knownOrigins) }));
  const internalLinks = new Map<string, { path: string; foundOn: string }>();
  const longest = Math.max(0, ...linksByPage.map(({ links }) => links.length));
  for (let index = 0; index < longest; index += 1) {
    for (const { page, links } of linksByPage) {
      const link = links[index];
      if (link && !internalLinks.has(link.url))
        internalLinks.set(link.url, { path: link.path, foundOn: page.target.path });
    }
  }
  // New paths first; query-string variants of a path already seen (/products?product=…) only with leftover budget.
  const seenPaths = new Set(crawled.map((page) => normalizePath(stripQuery(page.target.path))));
  const newPaths: [string, { path: string; foundOn: string }][] = [];
  const queryVariants: [string, { path: string; foundOn: string }][] = [];
  for (const entry of internalLinks.entries()) {
    if (crawledPaths.has(normalizePath(entry[1].path))) continue;
    const base = normalizePath(stripQuery(entry[1].path));
    if (seenPaths.has(base)) queryVariants.push(entry);
    else {
      seenPaths.add(base);
      newPaths.push(entry);
    }
  }
  const uncheckedLinks = [...newPaths, ...queryVariants];
  let linksQueued = 0;
  for (const [url, link] of uncheckedLinks) {
    if (enqueue({ kind: "link", url, path: link.path, foundOn: link.foundOn }, MAX_LINK_CHECKS)) linksQueued += 1;
  }

  const deadline = Math.max(started + BUDGET_MS, Date.now() + MIN_LINK_WINDOW_MS);
  const probes = await mapLimit(jobs, LINK_CONCURRENCY, (job) => runProbe(job, deadline));
  const linkProbes = probes.filter((outcome) => outcome.job.kind === "link");
  const linkStats = {
    found: internalLinks.size,
    checked: linkProbes.filter((outcome) => !outcome.skipped).length,
    broken: 0,
    skipped: linkProbes.filter((outcome) => outcome.skipped).length + (uncheckedLinks.length - linksQueued),
  };

  // A crawled page that fails is reported once; links to it (with or without filters) add detail, not issues.
  const failedPageIssues = new Map(
    findings.issues
      .filter(
        (issue) => (issue.rule === "technical.page-status" || issue.rule === "technical.page-unreachable") && issue.url,
      )
      .map((issue) => [normalizePath(issue.url!), issue]),
  );
  const pageLinkSources = new Map<AuditIssue, { from: Set<string>; variants: Set<string> }>();
  const noteLink = (issue: AuditIssue, path: string, foundOn: string | undefined) => {
    const entry = pageLinkSources.get(issue) ?? { from: new Set<string>(), variants: new Set<string>() };
    if (foundOn) entry.from.add(foundOn);
    if (normalizePath(path) !== normalizePath(stripQuery(path))) entry.variants.add(path);
    pageLinkSources.set(issue, entry);
  };
  for (const { page, links } of linksByPage) {
    for (const link of links) {
      const issue = failedPageIssues.get(normalizePath(link.path));
      if (issue) noteLink(issue, link.path, page.target.path);
    }
  }

  for (const outcome of probes) {
    if (outcome.skipped) continue;
    const { job, status } = outcome;
    const failed = status === null || status >= 400;
    const where = job.foundOn ? ` Found on ${job.foundOn}.` : "";
    if (job.kind === "link") {
      if (status !== null && status >= 400) {
        linkStats.broken += 1;
        const parent = failedPageIssues.get(normalizePath(stripQuery(job.path)));
        if (parent) {
          noteLink(parent, job.path, job.foundOn);
          continue;
        }
        findings.add({
          rule: "technical.broken-link",
          severity: "error",
          category: "Technical",
          title: `Broken link to ${job.path} (${status})`,
          detail: `Visitors and search engines following this link land on an error page.${where}`,
          url: job.foundOn,
          key: job.url,
        });
      } else if (status === null) {
        findings.add({
          rule: "technical.link-unreachable",
          severity: "warning",
          category: "Technical",
          title: `Link to ${job.path} didn’t respond`,
          detail: `${outcome.error ?? "The request failed"}.${where}`,
          url: job.foundOn,
          key: job.url,
        });
      }
    } else if (job.kind === "sitemap") {
      if (failed) {
        findings.add({
          rule: "technical.sitemap-broken",
          severity: "error",
          category: "Technical",
          title: `Sitemap lists ${job.path}, which ${status ? `returns ${status}` : "doesn’t load"}`,
          detail:
            "Search engines waste crawl time on addresses in the sitemap that don’t work, and trust the sitemap less.",
          url: job.path,
        });
      } else if (status >= 300) {
        findings.add({
          rule: "technical.sitemap-redirect",
          severity: "warning",
          category: "Technical",
          title: `Sitemap lists ${job.path}, which redirects`,
          detail: "List the final address in the sitemap instead of one that redirects.",
          url: job.path,
        });
      }
    } else if (failed) {
      findings.add({
        rule: "social.share-image-broken",
        severity: "error",
        category: "Social",
        title: `Share image doesn’t load (${status ?? outcome.error ?? "no response"})`,
        detail: `WhatsApp, Facebook and LinkedIn previews of ${job.foundOn ?? "the site"} will show no picture: ${job.path}`,
        url: job.foundOn,
        key: job.url,
        fix: fixes.seo,
      });
    }
  }
  for (const [issue, { from, variants }] of pageLinkSources) {
    const sources = [...from];
    const shown = [...variants].slice(0, 3);
    issue.detail += sources.length
      ? ` Linked from ${listText(sources.slice(0, 3))}${sources.length > 3 ? " and other pages" : ""}.`
      : "";
    issue.detail += shown.length
      ? ` Links to ${listText(shown)}${variants.size > shown.length ? " and more" : ""} fail for the same reason.`
      : "";
  }

  /* ---- site-wide checks ---- */

  checkSite({
    findings,
    environment,
    site,
    settings,
    robots,
    sitemap,
    sitemapFile,
    pageResults,
    crawled,
    indexingAllowed,
  });
  checkContent({ findings, settings, catalog, testimonials, faqs, pageResults });

  /* ---- passed checks for the crawl ---- */

  if (analysed.length > 0) {
    const n = pluralize(analysed.length, "page");
    findings.passIfClean(["meta.title-missing"], "Meta tags", `Every page has a title (${n})`);
    findings.passIfClean(
      ["meta.title-short", "meta.title-long", "meta.title-multiple", "meta.default-title"],
      "Meta tags",
      `Page titles are ${TITLE_RANGE.min}–${TITLE_RANGE.max} characters`,
    );
    findings.passIfClean(["meta.description-missing"], "Meta tags", "Every page has a meta description");
    findings.passIfClean(
      ["meta.description-short", "meta.description-long", "meta.default-description"],
      "Meta tags",
      `Meta descriptions are ${DESCRIPTION_RANGE.min}–${DESCRIPTION_RANGE.max} characters`,
    );
    findings.passIfClean(
      ["meta.title-duplicate", "meta.description-duplicate"],
      "Meta tags",
      "Titles and descriptions are unique",
    );
    findings.passIfClean(
      ["content.h1-missing", "content.h1-multiple"],
      "Content",
      "Every page has exactly one H1 heading",
    );
    findings.passIfClean(["content.heading-skip"], "Content", "Heading levels don’t skip");
    findings.passIfClean(
      ["content.img-alt"],
      "Content",
      "All images have alt text",
      `${pluralize(sum(pageResults, "images"), "image")} checked`,
    );
    findings.passIfClean(["content.thin"], "Content", "Pages have enough text to rank");
    findings.passIfClean(
      ["technical.page-status", "technical.page-unreachable"],
      "Technical",
      "All audited pages load",
      n,
    );
    findings.passIfClean(
      [
        "technical.canonical-missing",
        "technical.canonical-relative",
        "technical.canonical-host",
        "technical.canonical-other",
      ],
      "Technical",
      "Canonical URLs are set and absolute",
    );
    findings.passIfClean(["technical.lang-missing"], "Technical", "Page language is declared");
    findings.passIfClean(
      ["technical.viewport-missing", "technical.viewport-width"],
      "Technical",
      "Mobile viewport is set",
    );
    if (indexingAllowed)
      findings.passIfClean(["technical.noindex"], "Technical", "No page is accidentally hidden from search engines");
    findings.passIfClean(["social.og-missing", "social.og-image-relative"], "Social", "Open Graph tags are present");
    findings.passIfClean(["social.twitter-card"], "Social", "Twitter/X card is set");
    if (jobs.some((job) => job.kind === "share-image"))
      findings.passIfClean(["social.share-image-broken"], "Social", "Share image loads");
    findings.passIfClean(["structured.jsonld-invalid"], "Structured data", "Structured data is valid JSON-LD");
    const largest = Math.max(...pageResults.map((page) => page.bytes));
    findings.passIfClean(
      ["performance.html-size"],
      "Performance",
      "Pages are a reasonable size",
      `Largest: ${formatBytes(largest)}`,
    );
    if (environment === "production")
      findings.passIfClean(["performance.slow"], "Performance", "Pages respond quickly");
    findings.passIfClean(["performance.many-images"], "Performance", "Image count per page is reasonable");
  }
  if (linkStats.checked > 0) {
    findings.passIfClean(
      ["technical.broken-link", "technical.link-unreachable"],
      "Technical",
      "No broken internal links",
      `${pluralize(linkStats.checked, "link")} checked`,
    );
  }

  return compileReport({ findings, pageResults, linkStats, site, environment, started, runBy: options.runBy ?? "" });
}

/* ------------------------------------------------------------ page checks */

interface PageContext {
  site: string;
  knownOrigins: Set<string>;
  findings: Findings;
  environment: AuditReport["environment"];
  indexingAllowed: boolean;
  seo: { title: string; description: string };
}

function analysePage(page: CrawledPage, context: PageContext): AuditPageResult {
  const { findings, site, knownOrigins } = context;
  const { target } = page;
  const path = target.path;
  const metaFix = target.source.kind === "html-page" ? fixes.page(target.source.id) : fixes.seo;
  const pageFix = target.source.kind === "html-page" ? fixes.page(target.source.id) : undefined;
  const result: AuditPageResult = {
    url: path,
    label: target.label,
    status: page.status,
    error: page.error,
    timeMs: Math.round(page.timeMs),
    bytes: page.bytes,
    title: null,
    titleLength: 0,
    description: null,
    descriptionLength: 0,
    h1Count: 0,
    canonical: null,
    lang: null,
    images: 0,
    imagesMissingAlt: 0,
    jsonLdBlocks: 0,
    jsonLdTypes: [],
    internalLinks: 0,
    words: 0,
    noindex: false,
  };

  if (page.status === null) {
    findings.add({
      rule: "technical.page-unreachable",
      severity: "error",
      category: "Technical",
      title: `${path} didn’t load`,
      detail: `${page.error ?? "The request failed"}. Search engines can’t index a page that doesn’t respond.`,
      url: path,
      fix: pageFix,
    });
    return result;
  }
  if (page.status >= 400) {
    findings.add({
      rule: "technical.page-status",
      severity: "error",
      category: "Technical",
      title: `${path} returns ${page.status}`,
      detail:
        page.status === 404 || page.status === 410
          ? "The page doesn’t exist. Visitors and search engines following links to it hit a dead end."
          : `The server answered with an error (${page.status}), so search engines can’t read this page.`,
      url: path,
      fix: pageFix,
    });
    return result;
  }

  const finalPath = pathOf(page.finalUrl, knownOrigins);
  if (finalPath && !samePath(finalPath, path)) {
    result.redirectedTo = finalPath;
    findings.add({
      rule: "technical.page-redirect",
      severity: "notice",
      category: "Technical",
      title: `${path} redirects to ${finalPath}`,
      detail: "Link to the final address directly; every redirect adds a round trip for visitors and crawlers.",
      url: path,
    });
  }
  if (!page.parsed) {
    findings.add({
      rule: "technical.not-html",
      severity: "warning",
      category: "Technical",
      title: `${path} isn’t an HTML page`,
      detail: `It was served as “${page.contentType || "unknown"}”, so it was not audited.`,
      url: path,
    });
    return result;
  }

  const doc = page.parsed;
  const pageUrl = page.finalUrl;
  const add = (issue: Omit<NewIssue, "url">) => findings.add({ ...issue, url: path });

  /* title */
  const titles = unique(doc.titles.filter(Boolean));
  const title = titles[0] ?? null;
  result.title = title;
  result.titleLength = title?.length ?? 0;
  if (!title) {
    add({
      rule: "meta.title-missing",
      severity: "error",
      category: "Meta tags",
      title: "Page has no title",
      detail: "The title is the blue headline in Google results and the text on the browser tab. Every page needs one.",
      fix: metaFix,
    });
  } else if (title !== context.seo.title || target.source.kind === "html-page") {
    // The site-wide default title is checked once, under the settings checks.
    if (title.length < TITLE_RANGE.min) {
      add({
        rule: "meta.title-short",
        severity: "warning",
        category: "Meta tags",
        title: `Title is short (${title.length} characters)`,
        detail: `“${title}”. Aim for ${TITLE_RANGE.min}–${TITLE_RANGE.max} characters that say what the page offers and where.`,
        fix: metaFix,
      });
    } else if (title.length > TITLE_RANGE.max) {
      add({
        rule: "meta.title-long",
        severity: "warning",
        category: "Meta tags",
        title: `Title is long (${title.length} characters)`,
        detail: `Google shows about 60 characters and cuts the rest: “${title}”.`,
        fix: metaFix,
      });
    }
  }
  if (titles.length > 1) {
    add({
      rule: "meta.title-multiple",
      severity: "warning",
      category: "Meta tags",
      title: `Page has ${titles.length} different titles`,
      detail: `Search engines pick one at random: ${titles.map((text) => `“${text}”`).join(", ")}.`,
      fix: metaFix,
    });
  }

  /* description */
  const description = metaContent(doc.metas, "description")?.trim() || null;
  result.description = description;
  result.descriptionLength = description?.length ?? 0;
  if (!description) {
    add({
      rule: "meta.description-missing",
      severity: "error",
      category: "Meta tags",
      title: "Page has no meta description",
      detail:
        "Google shows the description under the title in results. Without one it picks random text from the page.",
      fix: metaFix,
    });
  } else if (description !== context.seo.description || target.source.kind === "html-page") {
    if (description.length < DESCRIPTION_RANGE.min) {
      add({
        rule: "meta.description-short",
        severity: "warning",
        category: "Meta tags",
        title: `Meta description is short (${description.length} characters)`,
        detail: `Use ${DESCRIPTION_RANGE.min}–${DESCRIPTION_RANGE.max} characters to sell the page in search results: “${description}”.`,
        fix: metaFix,
      });
    } else if (description.length > DESCRIPTION_RANGE.max) {
      add({
        rule: "meta.description-long",
        severity: "warning",
        category: "Meta tags",
        title: `Meta description is long (${description.length} characters)`,
        detail: `Google cuts descriptions at about ${DESCRIPTION_RANGE.max} characters, so the end won’t be seen.`,
        fix: metaFix,
      });
    }
  }

  /* headings */
  const h1s = doc.headings.filter((heading) => heading.level === 1);
  result.h1Count = h1s.length;
  if (h1s.length === 0) {
    add({
      rule: "content.h1-missing",
      severity: "error",
      category: "Content",
      title: "Page has no H1 heading",
      detail:
        "The main heading tells search engines and screen readers what the page is about. Each page needs exactly one.",
      fix: pageFix,
    });
  } else if (h1s.length > 1) {
    add({
      rule: "content.h1-multiple",
      severity: "warning",
      category: "Content",
      title: `Page has ${h1s.length} H1 headings`,
      detail: `Keep one main heading and make the others H2: ${quoteList(h1s.map((heading) => heading.text || "(empty)"))}.`,
      fix: pageFix,
    });
  }
  const skips: string[] = [];
  let previousLevel = 0;
  for (const heading of doc.headings) {
    if (previousLevel && heading.level > previousLevel + 1) {
      skips.push(`H${previousLevel} → H${heading.level}${heading.text ? ` (“${heading.text}”)` : ""}`);
    }
    previousLevel = heading.level;
  }
  if (skips.length > 0) {
    add({
      rule: "content.heading-skip",
      severity: "notice",
      category: "Content",
      title: `Heading levels skip (${skips.length}×)`,
      detail: `Headings should step down one level at a time so the outline makes sense: ${skips.slice(0, 3).join("; ")}${skips.length > 3 ? "; …" : ""}.`,
      fix: pageFix,
    });
  }

  /* canonical */
  const canonicalTags = linksWithRel(doc.links, "canonical");
  const canonical = canonicalTags[0]?.href?.trim() || null;
  result.canonical = canonical;
  if (!canonical) {
    add({
      rule: "technical.canonical-missing",
      severity: "warning",
      category: "Technical",
      title: "No canonical URL",
      detail:
        "A canonical link names the page’s preferred address, so copies with tracking parameters (?utm=…, ?fbclid=…) don’t split its ranking.",
      fix: pageFix,
    });
  } else if (!/^https?:\/\//i.test(canonical)) {
    add({
      rule: "technical.canonical-relative",
      severity: "warning",
      category: "Technical",
      title: "Canonical URL isn’t absolute",
      detail: `“${canonical}” should be a full address starting with https://.`,
      fix: pageFix,
    });
  } else {
    const canonicalOrigin = safeOrigin(canonical);
    const canonicalPath = pathOf(canonical, knownOrigins);
    if (!canonicalOrigin || !knownOrigins.has(canonicalOrigin)) {
      add({
        rule: "technical.canonical-host",
        severity: "warning",
        category: "Technical",
        title: "Canonical URL points to another domain",
        detail: `${canonical} — search engines will credit that domain instead of this one.`,
        fix: pageFix,
      });
    } else if (canonicalPath && !samePath(stripQuery(canonicalPath), stripQuery(finalPath ?? path))) {
      add({
        rule: "technical.canonical-other",
        severity: "warning",
        category: "Technical",
        title: `Canonical URL points to ${canonicalPath}`,
        detail:
          "This page names a different page as its main address, so search engines will usually show that one instead.",
        fix: pageFix,
      });
    }
  }

  /* language & viewport */
  result.lang = doc.lang;
  if (!doc.lang) {
    add({
      rule: "technical.lang-missing",
      severity: "warning",
      category: "Technical",
      title: "Page language isn’t declared",
      detail:
        'Add lang="en-IN" to the <html> tag so search engines target the right audience and screen readers pronounce text correctly.',
      fix: pageFix,
    });
  }
  const viewport = metaContent(doc.metas, "viewport");
  if (viewport === null) {
    add({
      rule: "technical.viewport-missing",
      severity: "error",
      category: "Technical",
      title: "No mobile viewport",
      detail: "Without a viewport tag phones show the page zoomed out, and Google ranks pages by their mobile version.",
      fix: pageFix,
    });
  } else if (!/width\s*=\s*device-width/i.test(viewport)) {
    add({
      rule: "technical.viewport-width",
      severity: "warning",
      category: "Technical",
      title: "Viewport doesn’t use the device width",
      detail: `The viewport is “${viewport}”; use width=device-width, initial-scale=1.`,
      fix: pageFix,
    });
  }

  /* indexing */
  const robotsMeta = [metaContent(doc.metas, "robots"), metaContent(doc.metas, "googlebot")].filter(Boolean).join(", ");
  const noindex = /noindex|\bnone\b/i.test(robotsMeta) || /noindex|\bnone\b/i.test(page.robotsHeader);
  const wantsNoindex = target.source.kind === "html-page" && target.source.noindex;
  result.noindex = noindex;
  if (noindex && !wantsNoindex && context.indexingAllowed) {
    add({
      rule: "technical.noindex",
      severity: "error",
      category: "Technical",
      title: "Page is hidden from search engines",
      detail: `It says “${robotsMeta || page.robotsHeader}” (${robotsMeta ? "robots meta tag" : "X-Robots-Tag header"}), so Google will drop it from results.`,
      fix: pageFix,
    });
  } else if (!noindex && wantsNoindex) {
    add({
      rule: "technical.noindex-ignored",
      severity: "warning",
      category: "Technical",
      title: "Page should be hidden from search engines but isn’t",
      detail: "The page is set to “hide from search engines”, but it doesn’t send a noindex instruction.",
      fix: pageFix,
    });
  }

  /* social */
  const openGraph = {
    "og:title": metaContent(doc.metas, "og:title"),
    "og:description": metaContent(doc.metas, "og:description"),
    "og:image": metaContent(doc.metas, "og:image"),
  };
  const missingOpenGraph = Object.entries(openGraph)
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);
  if (missingOpenGraph.length > 0) {
    add({
      rule: "social.og-missing",
      severity: "warning",
      category: "Social",
      title: `Missing Open Graph tags (${missingOpenGraph.join(", ")})`,
      detail:
        target.source.kind === "html-page"
          ? "WhatsApp, Facebook and LinkedIn use these to build the preview card when someone shares the page."
          : "WhatsApp, Facebook and LinkedIn use these to build the preview card when someone shares the page. The site-wide share settings set them, so this page’s own metadata (in the website code) is overriding them.",
      fix: pageFix,
    });
  }
  const shareImage = openGraph["og:image"]?.trim();
  if (shareImage && !/^https?:\/\//i.test(shareImage)) {
    add({
      rule: "social.og-image-relative",
      severity: "warning",
      category: "Social",
      title: "Share image address isn’t absolute",
      detail: `“${shareImage}” must be a full https:// address or social networks ignore it.`,
      fix: pageFix,
    });
  }
  if (!metaContent(doc.metas, "twitter:card")?.trim()) {
    add({
      rule: "social.twitter-card",
      severity: "notice",
      category: "Social",
      title: "No Twitter/X card",
      detail: "Add a twitter:card tag (summary_large_image) so links shared on X show a large preview.",
      fix: pageFix,
    });
  }

  /* images */
  const missingAlt = doc.images.filter((image) => image.alt === null);
  result.images = doc.images.length;
  result.imagesMissingAlt = missingAlt.length;
  if (missingAlt.length > 0) {
    const names = unique(missingAlt.map((image) => describeImage(image.src, pageUrl)));
    add({
      rule: "content.img-alt",
      severity: "warning",
      category: "Content",
      title: `${pluralize(missingAlt.length, "image")} without alt text`,
      detail: `Alt text describes images to Google Images and screen readers. Missing on: ${names.slice(0, 4).join(", ")}${names.length > 4 ? ", …" : ""}.`,
      fix: pageFix,
    });
  }
  if (doc.images.length > 100) {
    add({
      rule: "performance.many-images",
      severity: "notice",
      category: "Performance",
      title: `Page has ${doc.images.length} images`,
      detail: "That many images slows the page on mobile data. Make sure images below the fold load lazily.",
    });
  }

  /* structured data */
  const types = new Set<string>();
  const invalid: string[] = [];
  for (const block of doc.jsonLd) {
    try {
      collectTypes(JSON.parse(block), types);
      result.jsonLdBlocks += 1;
    } catch (error) {
      invalid.push(error instanceof Error ? error.message : "Invalid JSON");
    }
  }
  result.jsonLdTypes = [...types];
  if (invalid.length > 0) {
    add({
      rule: "structured.jsonld-invalid",
      severity: "error",
      category: "Structured data",
      title: `${pluralize(invalid.length, "structured-data block")} can’t be read`,
      detail: `Google ignores JSON-LD with syntax errors (${invalid[0]}).`,
      fix: pageFix,
    });
  }
  if (path === "/" && result.jsonLdBlocks === 0) {
    add({
      rule: "structured.jsonld-missing",
      severity: "warning",
      category: "Structured data",
      title: "Homepage has no structured data",
      detail: "A LocalBusiness JSON-LD block lets Google show the shop’s address, phone and hours in results and Maps.",
    });
  }
  if (normalizePath(path) === "/products" && result.jsonLdBlocks === 0) {
    add({
      rule: "structured.jsonld-products",
      severity: "notice",
      category: "Structured data",
      title: "Products page has no structured data",
      detail:
        "Product or ItemList markup lets Google show product names, prices and availability right in the results.",
    });
  }

  /* size, speed, words, links */
  if (page.truncated || page.bytes > 2 * 1024 * 1024) {
    add({
      rule: "performance.html-size",
      severity: "warning",
      category: "Performance",
      title: `Page HTML is very large (${page.truncated ? `over ${formatBytes(MAX_HTML_BYTES)}` : formatBytes(page.bytes)})`,
      detail: `Heavy pages load slowly on mobile data and may be cut off by crawlers.${devNote(context)}`,
    });
  } else if (page.bytes > 1024 * 1024) {
    add({
      rule: "performance.html-size",
      severity: "notice",
      category: "Performance",
      title: `Page HTML is large (${formatBytes(page.bytes)})`,
      detail: `Keep the HTML of a page under 1 MB so it loads quickly on mobile data.${devNote(context)}`,
    });
  }
  if (context.environment === "production" && page.timeMs > 1500) {
    add({
      rule: "performance.slow",
      severity: page.timeMs > 3000 ? "warning" : "notice",
      category: "Performance",
      title: `Page took ${(page.timeMs / 1000).toFixed(1)} s to load`,
      detail: "Slow server responses hurt rankings and lose visitors on mobile networks.",
    });
  }
  result.words = doc.words;
  if (doc.words < 150) {
    add({
      rule: "content.thin",
      severity: "notice",
      category: "Content",
      title: `Very little text (${pluralize(doc.words, "word")})`,
      detail: "Pages with only a few sentences rarely rank. Explain the product or service in your own words.",
      fix: pageFix,
    });
  }
  result.internalLinks = internalHrefs(page, site, knownOrigins).length;
  if (result.internalLinks === 0) {
    add({
      rule: "content.no-internal-links",
      severity: "notice",
      category: "Content",
      title: "Page doesn’t link to the rest of the site",
      detail: "Add links to the homepage or products so visitors (and crawlers) can continue from here.",
      fix: pageFix,
    });
  }

  return result;
}

/** Pages sharing a title or description compete with each other in results. */
function checkDuplicates(
  pages: AuditPageResult[],
  findings: Findings,
  fixForPath: (path: string) => AuditFix | undefined,
) {
  const firstFix = (list: AuditPageResult[]) => list.map((page) => fixForPath(page.url)).find(Boolean);
  const groups = (pick: (page: AuditPageResult) => string | null) => {
    const map = new Map<string, AuditPageResult[]>();
    for (const page of pages) {
      const value = pick(page)?.trim().toLowerCase();
      if (value) map.set(value, [...(map.get(value) ?? []), page]);
    }
    return [...map.values()].filter((list) => list.length > 1);
  };
  for (const list of groups((page) => page.title)) {
    findings.add({
      rule: "meta.title-duplicate",
      severity: "warning",
      category: "Meta tags",
      title: `${list.length} pages share the title “${list[0].title}”`,
      detail: `Give each page its own title so search engines can tell them apart: ${list.map((page) => page.url).join(", ")}.`,
      url: list[1].url,
      key: list[0].title ?? "",
      fix: firstFix(list),
    });
  }
  for (const list of groups((page) => page.description)) {
    findings.add({
      rule: "meta.description-duplicate",
      severity: "warning",
      category: "Meta tags",
      title: `${list.length} pages share the same meta description`,
      detail: `Write a description for each page: ${list.map((page) => page.url).join(", ")}.`,
      url: list[1].url,
      key: list[0].description ?? "",
      fix: firstFix(list),
    });
  }
}

/* ------------------------------------------------------------ site checks */

function checkSite({
  findings,
  environment,
  site,
  settings,
  robots,
  sitemap,
  sitemapFile,
  pageResults,
  crawled,
  indexingAllowed,
}: {
  findings: Findings;
  environment: AuditReport["environment"];
  site: string;
  settings: Awaited<ReturnType<typeof getSiteSettings>>;
  robots: TextFile;
  sitemap: SitemapInfo;
  sitemapFile: TextFile;
  pageResults: AuditPageResult[];
  crawled: CrawledPage[];
  indexingAllowed: boolean;
}) {
  const { seo } = settings;

  if (environment === "production") {
    if (new URL(site).protocol !== "https:") {
      findings.add({
        rule: "technical.https",
        severity: "error",
        category: "Technical",
        title: "Site isn’t served over HTTPS",
        detail: `${site} uses plain HTTP. Browsers mark it “Not secure” and Google ranks HTTPS sites higher.`,
      });
    } else {
      findings.pass("technical.https", "Technical", "Site is served over HTTPS");
    }
  }

  if (!indexingAllowed) {
    findings.add({
      rule: "technical.indexing-off",
      severity: "warning",
      category: "Technical",
      title: "Search engine indexing is turned off",
      detail:
        "Every page tells search engines not to list it, so the site won’t appear in Google. Turn indexing on when the site is ready.",
      fix: fixes.seo,
    });
  } else {
    findings.pass("technical.indexing-off", "Technical", "Search engine indexing is on");
  }

  /* robots.txt */
  if (!robots.ok) {
    findings.add({
      rule: "technical.robots-missing",
      severity: "error",
      category: "Technical",
      title: `robots.txt ${robots.status ? `returns ${robots.status}` : "didn’t load"}`,
      detail: `${robots.error ? `${robots.error}. ` : ""}Search engines read /robots.txt before crawling; without it they may crawl less of the site.`,
      url: "/robots.txt",
    });
  } else {
    const rules = parseRobots(robots.text);
    if (rules.blocksAll && indexingAllowed) {
      findings.add({
        rule: "technical.robots-blocks-all",
        severity: "error",
        category: "Technical",
        title: "robots.txt blocks the whole site",
        detail: "It contains “Disallow: /” for all crawlers, so search engines can’t read any page.",
        url: "/robots.txt",
      });
    } else {
      findings.pass("technical.robots-blocks-all", "Technical", "robots.txt is reachable and allows crawling");
    }
    if (rules.sitemaps.length === 0) {
      findings.add({
        rule: "technical.robots-sitemap",
        severity: "notice",
        category: "Technical",
        title: "robots.txt doesn’t mention the sitemap",
        detail: "Add a “Sitemap: https://…/sitemap.xml” line so every search engine finds it.",
        url: "/robots.txt",
      });
    } else {
      findings.pass("technical.robots-sitemap", "Technical", "robots.txt points to the sitemap");
    }
  }

  /* sitemap.xml */
  if (!sitemapFile.ok) {
    findings.add({
      rule: "technical.sitemap-missing",
      severity: "error",
      category: "Technical",
      title: `sitemap.xml ${sitemapFile.status ? `returns ${sitemapFile.status}` : "didn’t load"}`,
      detail: `${sitemapFile.error ? `${sitemapFile.error}. ` : ""}The sitemap lists every page for search engines.`,
      url: "/sitemap.xml",
    });
  } else if (!sitemap.valid) {
    findings.add({
      rule: "technical.sitemap-invalid",
      severity: "error",
      category: "Technical",
      title: "sitemap.xml isn’t a valid sitemap",
      detail: "It loads, but doesn’t contain a <urlset> or <sitemapindex>, so search engines ignore it.",
      url: "/sitemap.xml",
    });
  } else if (sitemap.paths.length === 0) {
    findings.add({
      rule: "technical.sitemap-empty",
      severity: "error",
      category: "Technical",
      title: "sitemap.xml lists no pages",
      detail: "Search engines rely on the sitemap to discover pages; this one is empty.",
      url: "/sitemap.xml",
    });
  } else {
    findings.pass(
      "technical.sitemap-missing",
      "Technical",
      "Sitemap is reachable",
      pluralize(sitemap.paths.length, "URL"),
    );
    if (sitemap.foreign.length > 0) {
      findings.add({
        rule: "technical.sitemap-domain",
        severity: "warning",
        category: "Technical",
        title: `Sitemap lists ${pluralize(sitemap.foreign.length, "address", "addresses")} on another domain`,
        detail: `Sitemaps may only list pages of their own site, e.g. ${sitemap.foreign[0]}.`,
        url: "/sitemap.xml",
      });
    }
    const listed = new Set(sitemap.paths.map((path) => normalizePath(stripQuery(path))));
    for (const page of crawled) {
      const result = pageResults.find((item) => item.url === page.target.path);
      if (!result || result.status !== 200 || result.redirectedTo || page.target.source.kind === "sitemap") continue;
      const isListed = listed.has(normalizePath(page.target.path));
      if (!isListed && !result.noindex) {
        findings.add({
          rule: "technical.sitemap-missing-page",
          severity: "warning",
          category: "Technical",
          title: `${page.target.path} isn’t in the sitemap`,
          detail: "Search engines discover and refresh pages faster when the sitemap lists them.",
          url: page.target.path,
          fix: page.target.source.kind === "html-page" ? fixes.page(page.target.source.id) : undefined,
        });
      } else if (isListed && result.noindex) {
        findings.add({
          rule: "technical.sitemap-noindex",
          severity: "warning",
          category: "Technical",
          title: `Sitemap lists ${page.target.path}, which is hidden from search engines`,
          detail: "Pages marked noindex shouldn’t be in the sitemap; the mixed signal wastes crawl time.",
          url: page.target.path,
          fix: page.target.source.kind === "html-page" ? fixes.page(page.target.source.id) : undefined,
        });
      }
    }
    findings.passIfClean(["technical.sitemap-missing-page"], "Technical", "Audited pages are listed in the sitemap");
    const listedFailures = pageResults.filter(
      (page) => listed.has(normalizePath(page.url)) && (page.status === null || page.status >= 400),
    );
    if (listedFailures.length === 0) {
      findings.passIfClean(
        ["technical.sitemap-broken", "technical.sitemap-redirect"],
        "Technical",
        "Sitemap URLs load",
      );
    }
  }

  /* search console, analytics, default meta */
  if (!seo.googleVerification.trim()) {
    findings.add({
      rule: "technical.search-console",
      severity: "notice",
      category: "Technical",
      title: "Google Search Console isn’t verified",
      detail:
        "Add the verification code to see the searches that bring visitors, indexing problems, and to submit the sitemap.",
      fix: fixes.seo,
    });
  } else {
    findings.pass("technical.search-console", "Technical", "Google Search Console verification is set");
  }
  if (!seo.gaMeasurementId.trim()) {
    findings.add({
      rule: "technical.analytics",
      severity: "notice",
      category: "Technical",
      title: "Google Analytics (GA4) isn’t set up",
      detail: "Add a GA4 measurement ID to see how many people visit and which pages lead to enquiries.",
      fix: fixes.seo,
    });
  } else {
    findings.pass("technical.analytics", "Technical", "Google Analytics (GA4) is set up");
  }

  if (seo.title.length < TITLE_RANGE.min || seo.title.length > TITLE_RANGE.max) {
    findings.add({
      rule: "meta.default-title",
      severity: "warning",
      category: "Meta tags",
      title: `Default SEO title is ${seo.title.length} characters`,
      detail: `It’s used for the homepage and any page without its own title. Aim for ${TITLE_RANGE.min}–${TITLE_RANGE.max}: “${seo.title}”.`,
      fix: fixes.seo,
    });
  }
  if (seo.description.length < DESCRIPTION_RANGE.min || seo.description.length > DESCRIPTION_RANGE.max) {
    findings.add({
      rule: "meta.default-description",
      severity: "warning",
      category: "Meta tags",
      title: `Default meta description is ${seo.description.length} characters`,
      detail:
        seo.description.length > DESCRIPTION_RANGE.max
          ? `Google cuts descriptions at about ${DESCRIPTION_RANGE.max} characters, so the end of it is never seen in results.`
          : `Use ${DESCRIPTION_RANGE.min}–${DESCRIPTION_RANGE.max} characters to sell the business in search results.`,
      fix: fixes.seo,
    });
  }
  findings.passIfClean(
    ["meta.default-title", "meta.default-description"],
    "Meta tags",
    "Default SEO title and description are a good length",
  );
}

/* --------------------------------------------------------- content checks */

function checkContent({
  findings,
  settings,
  catalog,
  testimonials,
  faqs,
  pageResults,
}: {
  findings: Findings;
  settings: Awaited<ReturnType<typeof getSiteSettings>>;
  catalog: Awaited<ReturnType<typeof getCatalog>>;
  testimonials: Awaited<ReturnType<typeof getTestimonials>>;
  faqs: Awaited<ReturnType<typeof getFaqs>>;
  pageResults: AuditPageResult[];
}) {
  const { products, categories, brands } = catalog;
  const home = pageResults.find((page) => page.url === "/" && page.status === 200);

  /* catalogue */
  if (products.length === 0) {
    findings.add({
      rule: "catalogue.empty",
      severity: "error",
      category: "Catalogue",
      title: "No products are published",
      detail: "The product catalogue is empty, so there’s nothing for search engines to show for product searches.",
      fix: fixes.products,
    });
  }
  for (const product of products) {
    const fix = fixes.product(product.id);
    const name = `“${product.name}”`;
    if (!product.image) {
      findings.add({
        rule: "catalogue.product-image",
        severity: "warning",
        category: "Catalogue",
        title: `${name} has no image`,
        detail: "Products with a photo get far more clicks, and Google Images can’t show a product without one.",
        key: product.id,
        fix,
      });
    }
    if (!product.description.trim()) {
      findings.add({
        rule: "catalogue.product-description",
        severity: "warning",
        category: "Catalogue",
        title: `${name} has no description`,
        detail:
          "A few sentences on capacity, use and warranty help buyers decide and give search engines words to match.",
        key: product.id,
        fix,
      });
    }
    if (product.specs.length === 0) {
      findings.add({
        rule: "catalogue.product-specs",
        severity: "warning",
        category: "Catalogue",
        title: `${name} has no specifications`,
        detail: "Buyers compare batteries and inverters by their specs (Ah, VA, warranty); add the key ones.",
        key: product.id,
        fix,
      });
    } else if (!product.specs.some((spec) => spec.highlight)) {
      findings.add({
        rule: "catalogue.product-highlights",
        severity: "notice",
        category: "Catalogue",
        title: `${name} has no highlighted specs`,
        detail:
          "Highlight up to four key specs to choose what the product card shows; otherwise the first four are used.",
        key: product.id,
        fix,
      });
    }
    if (product.price.show && product.price.price === null) {
      findings.add({
        rule: "catalogue.product-price",
        severity: "warning",
        category: "Catalogue",
        title: `${name} is set to show its price, but has none`,
        detail: "Enter the price or turn off “show price” so the card doesn’t look incomplete.",
        key: product.id,
        fix,
      });
    }
    if (!product.category) {
      findings.add({
        rule: "catalogue.product-category",
        severity: "notice",
        category: "Catalogue",
        title: `${name} has no category`,
        detail: "Products without a category don’t appear when visitors browse by category.",
        key: product.id,
        fix,
      });
    }
  }
  const duplicates = (pick: (product: (typeof products)[number]) => string) => {
    const map = new Map<string, typeof products>();
    for (const product of products) {
      const value = pick(product).trim().toLowerCase();
      if (value) map.set(value, [...(map.get(value) ?? []), product]);
    }
    return [...map.values()].filter((list) => list.length > 1);
  };
  for (const list of duplicates((product) => product.name)) {
    findings.add({
      rule: "catalogue.duplicate-name",
      severity: "warning",
      category: "Catalogue",
      title: `${list.length} products are named “${list[0].name}”`,
      detail:
        "Identical names confuse buyers and compete with each other in search. Add the model or capacity to each name.",
      key: list[0].name.toLowerCase(),
      fix: fixes.product(list[1].id),
    });
  }
  for (const list of duplicates((product) => product.slug)) {
    findings.add({
      rule: "catalogue.duplicate-slug",
      severity: "warning",
      category: "Catalogue",
      title: `${list.length} products share the address “${list[0].slug}”`,
      detail: "Each product needs its own URL slug, otherwise only one of them can be reached.",
      key: list[0].slug,
      fix: fixes.product(list[1].id),
    });
  }
  const productsPerCategory = countBy(products, (product) => product.category?.slug);
  for (const category of categories) {
    if (productsPerCategory.get(category.slug)) continue;
    findings.add({
      rule: "catalogue.empty-category",
      severity: category.showOnHomepage ? "warning" : "notice",
      category: "Catalogue",
      title: `Category “${category.name}” has no published products`,
      detail: category.showOnHomepage
        ? "It’s shown on the homepage, so visitors who open it find nothing. Add products or hide the category."
        : "Add products to it or remove the category.",
      key: category.slug,
      fix: fixes.catalogue,
    });
  }
  const productsPerBrand = countBy(products, (product) => product.brand?.slug);
  for (const brand of brands) {
    if (productsPerBrand.get(brand.slug)) continue;
    findings.add({
      rule: "catalogue.empty-brand",
      severity: "notice",
      category: "Catalogue",
      title: `Brand “${brand.name}” has no published products`,
      detail: "Its catalogue tab will be empty. Add products or deactivate the brand.",
      key: brand.slug,
      fix: fixes.catalogue,
    });
  }
  if (products.length > 0) {
    findings.passIfClean(
      ["catalogue.product-image"],
      "Catalogue",
      "Every product has an image",
      pluralize(products.length, "product"),
    );
    findings.passIfClean(["catalogue.product-description"], "Catalogue", "Every product has a description");
    findings.passIfClean(
      ["catalogue.product-specs", "catalogue.product-highlights"],
      "Catalogue",
      "Every product has highlighted specs",
    );
    findings.passIfClean(["catalogue.product-price"], "Catalogue", "Prices are set wherever they’re shown");
    findings.passIfClean(
      ["catalogue.duplicate-name", "catalogue.duplicate-slug"],
      "Catalogue",
      "Product names and addresses are unique",
    );
  }
  if (categories.length > 0)
    findings.passIfClean(["catalogue.empty-category"], "Catalogue", "Every category has products");

  /* trust */
  // Flagged samples, plus placeholders whose flag was cleared without replacing the text.
  const samples = testimonials.filter(
    (testimonial) =>
      testimonial.isSample ||
      testimonial.badge.kind === "sample" ||
      /\bsample (review|testimonial)\b/i.test(`${testimonial.badge.label} ${testimonial.quote}`),
  );
  if (samples.length > 0) {
    findings.add({
      rule: "trust.sample-testimonials",
      severity: "warning",
      category: "Trust",
      title: `${pluralize(samples.length, "sample testimonial")} ${samples.length === 1 ? "is" : "are"} still published`,
      detail: `Placeholder “Sample review” cards look fake to visitors and break Google’s review guidelines. Replace them with real customer reviews or hide them (${testimonials.length - samples.length} real ${testimonials.length - samples.length === 1 ? "review is" : "reviews are"} published).`,
      fix: fixes.testimonials,
    });
  } else if (testimonials.length === 0) {
    findings.add({
      rule: "trust.no-testimonials",
      severity: "notice",
      category: "Trust",
      title: "No customer reviews are published",
      detail: "Reviews from real customers are the strongest trust signal for a local business.",
      fix: fixes.testimonials,
    });
  } else {
    findings.pass(
      "trust.sample-testimonials",
      "Trust",
      "Only real customer reviews are published",
      pluralize(testimonials.length, "review"),
    );
  }

  const socialLabels: Record<string, string> = {
    facebook: "Facebook",
    linkedin: "LinkedIn",
    x: "X",
    instagram: "Instagram",
    youtube: "YouTube",
  };
  const emptySocial = Object.entries(settings.social)
    .filter(([, href]) => !href.trim())
    .map(([key]) => socialLabels[key] ?? key);
  if (emptySocial.length > 0) {
    findings.add({
      rule: "trust.social-links",
      severity: "notice",
      category: "Trust",
      title: `${pluralize(emptySocial.length, "social profile link")} ${emptySocial.length === 1 ? "is" : "are"} empty`,
      detail: `Add ${listText(emptySocial)} so visitors can follow the business and Google can connect the site to its profiles.`,
      fix: fixes.content,
    });
  } else {
    findings.pass("trust.social-links", "Trust", "Social profile links are filled in");
  }
  const missingLocal = [
    settings.business.businessHours.trim() ? null : "business hours",
    settings.business.mapUrl.trim() ? null : "a Google Maps link",
  ].filter((item): item is string => item !== null);
  if (missingLocal.length > 0) {
    findings.add({
      rule: "trust.local-details",
      severity: "notice",
      category: "Trust",
      title: `Add ${listText(missingLocal)}`,
      detail: "Opening hours and a map link help local customers find the shop and match your Google Business Profile.",
      fix: fixes.content,
    });
  } else {
    findings.pass("trust.local-details", "Trust", "Business hours and map link are set");
  }

  /* content settings */
  if (settings.announcement.enabled && !settings.announcement.text.trim()) {
    findings.add({
      rule: "content.announcement-empty",
      severity: "warning",
      category: "Content",
      title: "Announcement bar is on but has no text",
      detail: "Visitors see an empty strip at the top of every page. Add a message or turn the bar off.",
      fix: fixes.content,
    });
  }

  /* FAQs */
  if (faqs.length > 0) {
    const unanswered = faqs.filter((faq) => !faq.answer.trim());
    if (unanswered.length > 0) {
      findings.add({
        rule: "structured.faq-answers",
        severity: "notice",
        category: "Structured data",
        title: `${unanswered.length} of ${pluralize(faqs.length, "FAQ")} ${unanswered.length === 1 ? "has" : "have"} no answer`,
        detail:
          "Answered questions expand on the website and can appear as FAQ rich results in Google; unanswered ones only open WhatsApp.",
        fix: fixes.faqs,
      });
    } else {
      findings.pass(
        "structured.faq-answers",
        "Structured data",
        "Every FAQ has an answer",
        pluralize(faqs.length, "question"),
      );
    }
    const answered = faqs.length - unanswered.length;
    if (home && answered > 0) {
      const marked = pageResults.some((page) => page.jsonLdTypes.includes("FAQPage"));
      if (!marked) {
        findings.add({
          rule: "structured.faq-schema",
          severity: "notice",
          category: "Structured data",
          title: "Answered FAQs aren’t marked up as FAQPage",
          detail: `${pluralize(answered, "answered question")} could appear as rich results, but no audited page has FAQPage structured data.`,
        });
      } else {
        findings.pass("structured.faq-schema", "Structured data", "FAQs are marked up for rich results");
      }
    }
  }
  if (home && home.jsonLdBlocks > 0) {
    findings.pass(
      "structured.jsonld-missing",
      "Structured data",
      "Homepage has structured data",
      home.jsonLdTypes.join(", ") || undefined,
    );
  }
}

/* ---------------------------------------------------------------- scoring */

function compileReport({
  findings,
  pageResults,
  linkStats,
  site,
  environment,
  started,
  runBy,
}: {
  findings: Findings;
  pageResults: AuditPageResult[];
  linkStats: AuditReport["links"];
  site: string;
  environment: AuditReport["environment"];
  started: number;
  runBy: string;
}): AuditReport {
  const categoryOrder = new Map(auditCategories.map((category, index) => [category, index]));
  const issues = [...findings.issues].sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      (categoryOrder.get(a.category) ?? 0) - (categoryOrder.get(b.category) ?? 0) ||
      a.title.localeCompare(b.title),
  );
  const categories: AuditCategoryResult[] = auditCategories.map((category) => {
    const inCategory = issues.filter((issue) => issue.category === category);
    return {
      category,
      score: score(inCategory, CATEGORY_SENSITIVITY),
      errors: inCategory.filter((issue) => issue.severity === "error").length,
      warnings: inCategory.filter((issue) => issue.severity === "warning").length,
      notices: inCategory.filter((issue) => issue.severity === "notice").length,
      passed: findings.passed.filter((check) => check.category === category).length,
    };
  });
  const finished = Date.now();
  return {
    version: 1,
    origin: site,
    environment,
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - started,
    score: score(issues, 1),
    counts: {
      error: issues.filter((issue) => issue.severity === "error").length,
      warning: issues.filter((issue) => issue.severity === "warning").length,
      notice: issues.filter((issue) => issue.severity === "notice").length,
      passed: findings.passed.length,
    },
    categories,
    issues,
    passed: [...findings.passed].sort(
      (a, b) => (categoryOrder.get(a.category) ?? 0) - (categoryOrder.get(b.category) ?? 0),
    ),
    pages: pageResults,
    links: linkStats,
    runBy,
  };
}

/** 100 minus weighted penalties; repeats of a rule are dampened (see REPEAT_FACTOR). */
function score(issues: AuditIssue[], sensitivity: number) {
  const byRule = new Map<string, AuditIssue[]>();
  for (const issue of issues) byRule.set(issue.rule, [...(byRule.get(issue.rule) ?? []), issue]);
  let penalty = 0;
  for (const list of byRule.values()) {
    const base = Math.max(...list.map(issuePenalty));
    penalty += base * Math.min(1 + REPEAT_FACTOR * (list.length - 1), REPEAT_CAP);
  }
  return Math.max(0, Math.min(100, Math.round(100 - penalty * sensitivity)));
}

/* ---------------------------------------------------------------- network */

async function request(
  url: string,
  {
    method = "GET",
    signal,
    redirect = "follow",
    accept = "*/*",
  }: { method?: "GET" | "HEAD"; signal: AbortSignal; redirect?: RequestRedirect; accept?: string },
) {
  return fetch(url, {
    method,
    redirect,
    signal,
    cache: "no-store",
    headers: { "user-agent": USER_AGENT, accept, "x-seo-audit": "1" },
  });
}

async function crawlPage(site: string, target: CrawlTarget): Promise<CrawledPage> {
  const url = new URL(target.path, site).toString();
  const started = performance.now();
  try {
    const response = await request(url, {
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    });
    const contentType = response.headers.get("content-type") ?? "";
    const isHtml = /html/i.test(contentType);
    let body = { text: "", bytes: Number(response.headers.get("content-length")) || 0, truncated: false };
    if (isHtml) body = await readBody(response, MAX_HTML_BYTES);
    else await response.body?.cancel().catch(() => undefined);
    return {
      target,
      url,
      status: response.status,
      finalUrl: response.url || url,
      timeMs: performance.now() - started,
      bytes: body.bytes,
      truncated: body.truncated,
      contentType,
      robotsHeader: response.headers.get("x-robots-tag") ?? "",
      parsed: isHtml && response.status < 400 ? parseHtml(body.text) : null,
    };
  } catch (error) {
    return {
      target,
      url,
      status: null,
      error: describeError(error, PAGE_TIMEOUT_MS).message,
      finalUrl: url,
      timeMs: performance.now() - started,
      bytes: 0,
      truncated: false,
      contentType: "",
      robotsHeader: "",
      parsed: null,
    };
  }
}

async function fetchTextFile(url: string, accept: string): Promise<TextFile> {
  try {
    const response = await request(url, { signal: AbortSignal.timeout(FILE_TIMEOUT_MS), accept });
    const body = await readBody(response, MAX_FILE_BYTES);
    return {
      status: response.status,
      ok: response.ok,
      text: body.text,
      contentType: response.headers.get("content-type") ?? "",
    };
  } catch (error) {
    return { status: null, ok: false, error: describeError(error, FILE_TIMEOUT_MS).message, text: "", contentType: "" };
  }
}

/** HEAD first (cheap); GET when the server refuses HEAD or the HEAD request fails. Redirects count as working. */
async function runProbe(job: ProbeJob, deadline: number): Promise<ProbeOutcome> {
  const remaining = deadline - Date.now();
  if (remaining < 500) return { job, skipped: true, status: null };
  const timeoutMs = Math.min(LINK_TIMEOUT_MS, remaining);
  const signal = AbortSignal.timeout(timeoutMs);
  const attempt = async (method: "HEAD" | "GET") => {
    const response = await request(job.url, { method, signal, redirect: "manual" });
    await response.body?.cancel().catch(() => undefined);
    return response.status;
  };
  try {
    let status = await attempt("HEAD");
    if (status === 405 || status === 501) status = await attempt("GET");
    return { job, skipped: false, status };
  } catch (error) {
    const first = describeError(error, timeoutMs);
    if (!first.timedOut) {
      try {
        return { job, skipped: false, status: await attempt("GET") };
      } catch (retryError) {
        const second = describeError(retryError, timeoutMs);
        return { job, skipped: false, status: null, error: second.message, timedOut: second.timedOut };
      }
    }
    // Out of time because the overall budget ran out (not because the link is slow): not checked.
    if (timeoutMs < LINK_TIMEOUT_MS) return { job, skipped: true, status: null };
    return { job, skipped: false, status: null, error: first.message, timedOut: true };
  }
}

async function readBody(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) return { text: "", bytes: 0, truncated: false };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      truncated = true;
      await reader.cancel().catch(() => undefined);
      break;
    }
    chunks.push(value);
  }
  return { text: Buffer.concat(chunks).toString("utf8"), bytes, truncated };
}

function describeError(error: unknown, timeoutMs: number): { message: string; timedOut: boolean } {
  const name = (error as { name?: string } | null)?.name;
  if (name === "TimeoutError" || name === "AbortError") {
    return { message: `No response within ${Math.round(timeoutMs / 1000)} s`, timedOut: true };
  }
  const cause = (error as { cause?: { code?: string; message?: string } } | null)?.cause;
  const code = cause?.code ?? "";
  if (code === "ECONNREFUSED") return { message: "Connection refused", timedOut: false };
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return { message: "Domain not found (DNS)", timedOut: false };
  if (code === "ECONNRESET") return { message: "Connection reset", timedOut: false };
  if (code.includes("CERT") || code.includes("SSL") || code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
    return { message: "HTTPS certificate problem", timedOut: false };
  }
  return { message: cause?.message ?? (error instanceof Error ? error.message : "Request failed"), timedOut: false };
}

async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/* ------------------------------------------------------- robots & sitemap */

function parseRobots(text: string) {
  const groups: { agents: string[]; rules: { type: "allow" | "disallow"; path: string }[] }[] = [];
  const sitemaps: string[] = [];
  let current: (typeof groups)[number] | null = null;
  let collectingAgents = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const colon = line.indexOf(":");
    if (!line || colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      if (!current || !collectingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      collectingAgents = true;
      continue;
    }
    collectingAgents = false;
    if (field === "sitemap" && value) sitemaps.push(value);
    else if ((field === "allow" || field === "disallow") && current) current.rules.push({ type: field, path: value });
  }
  const group =
    groups.find((item) => item.agents.includes("googlebot")) ?? groups.find((item) => item.agents.includes("*"));
  const blocksAll =
    !!group &&
    group.rules.some((rule) => rule.type === "disallow" && rule.path === "/") &&
    !group.rules.some((rule) => rule.type === "allow" && (rule.path === "/" || rule.path === "/$"));
  return { sitemaps, blocksAll };
}

interface SitemapInfo {
  valid: boolean;
  /** Paths on the audited site (addresses on the configured public domain are mapped to it). */
  paths: string[];
  /** Addresses on unrelated domains. */
  foreign: string[];
}

async function readSitemap(file: TextFile, site: string, knownOrigins: Set<string>): Promise<SitemapInfo> {
  if (!file.ok) return { valid: false, paths: [], foreign: [] };
  const isIndex = /<sitemapindex[\s>]/i.test(file.text);
  const valid = isIndex || /<urlset[\s>]/i.test(file.text);
  let locations = extractLocations(file.text);
  if (isIndex) {
    const children = await Promise.all(
      locations
        .map((location) => pathOf(location, knownOrigins))
        .filter((path): path is string => path !== null)
        .slice(0, 5)
        .map((path) => fetchTextFile(`${site}${path}`, "application/xml,text/xml;q=0.9,*/*;q=0.8")),
    );
    locations = children.flatMap((child) => (child.ok ? extractLocations(child.text) : []));
  }
  const paths: string[] = [];
  const foreign: string[] = [];
  for (const location of unique(locations).slice(0, 1000)) {
    const path = pathOf(location, knownOrigins);
    if (path === null) foreign.push(location);
    else if (!paths.some((other) => samePath(other, path))) paths.push(path);
  }
  return { valid, paths, foreign };
}

function extractLocations(xml: string) {
  return [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi)].map((match) =>
    match[1].replace(/&amp;/g, "&").trim(),
  );
}

/* -------------------------------------------------------------- utilities */

function internalHrefs(page: CrawledPage, site: string, knownOrigins: Set<string>) {
  const doc = page.parsed;
  if (!doc) return [];
  const base = (() => {
    try {
      return doc.baseHref ? new URL(doc.baseHref, page.finalUrl).toString() : page.finalUrl;
    } catch {
      return page.finalUrl;
    }
  })();
  const seen = new Map<string, { url: string; path: string }>();
  for (const anchor of doc.anchors) {
    const href = anchor.href.trim();
    if (!href || href.startsWith("#")) continue;
    const resolved = toSiteUrl(href, base, site, knownOrigins);
    if (!resolved) continue;
    // Framework assets and API endpoints aren't pages (and GET on an API route may have side effects).
    if (resolved.path.startsWith("/_next/") || resolved.path.startsWith("/api/")) continue;
    if (!seen.has(resolved.url)) seen.set(resolved.url, resolved);
  }
  return [...seen.values()];
}

/** Resolves `href` and maps it onto the audited site; null for other domains and non-web schemes. */
function toSiteUrl(href: string, base: string, site: string, knownOrigins: Set<string>) {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!knownOrigins.has(url.origin)) return null;
    url.hash = "";
    const path = `${url.pathname}${url.search}`;
    return { url: `${site}${path}`, path };
  } catch {
    return null;
  }
}

/** Path (+ query) of an absolute URL on one of the site's origins, else null. */
function pathOf(value: string, knownOrigins: Set<string>) {
  try {
    const url = new URL(value);
    return knownOrigins.has(url.origin) ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}

function safeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/** "/products/" → "/products", keeping any query string. */
function normalizePath(path: string) {
  const [pathname, ...query] = path.split("?");
  const clean = pathname.replace(/\/+$/, "") || "/";
  return query.length > 0 ? `${clean}?${query.join("?")}` : clean;
}
const samePath = (a: string, b: string) => normalizePath(a) === normalizePath(b);
const stripQuery = (path: string) => path.split("?")[0] || "/";
const looksLikePage = (path: string) =>
  !/\.(?:xml|txt|json|pdf|jpe?g|png|gif|webp|avif|svg|ico|zip|mp4|webm|css|js)(?:\?|$)/i.test(path);

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function countBy<T>(items: T[], key: (item: T) => string | undefined) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function sum(pages: AuditPageResult[], field: "images") {
  return pages.reduce((total, page) => total + page[field], 0);
}

function collectTypes(node: unknown, into: Set<string>, depth = 0) {
  if (depth > 3 || !node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, into, depth + 1);
    return;
  }
  const record = node as Record<string, unknown>;
  const type = record["@type"];
  for (const value of Array.isArray(type) ? type : [type]) if (typeof value === "string") into.add(value);
  if (record["@graph"]) collectTypes(record["@graph"], into, depth + 1);
}

/** A readable name for an image: the file name, unwrapping `/_next/image?url=…`. */
function describeImage(src: string, pageUrl: string) {
  if (!src) return "(no src)";
  if (src.startsWith("data:")) return "an inline image";
  try {
    const url = new URL(src, pageUrl);
    const inner = url.pathname.startsWith("/_next/image") ? url.searchParams.get("url") : null;
    const path = inner ? inner.split("?")[0] : url.pathname;
    return decodeURIComponent(path.split("/").filter(Boolean).pop() ?? path);
  } catch {
    return src.slice(0, 60);
  }
}

function quoteList(items: string[]) {
  const shown = items.slice(0, 3).map((item) => `“${item}”`);
  return `${shown.join(", ")}${items.length > 3 ? ", …" : ""}`;
}

function listText(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function devNote(context: Pick<PageContext, "environment">) {
  return context.environment === "development"
    ? " (Measured on the development server; production pages are smaller.)"
    : "";
}

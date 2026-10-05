/**
 * A small, forgiving HTML scanner for the SEO audit (no parser library is available). One linear
 * pass over the document collects what a search engine reads: title, meta and link tags, headings,
 * images, anchors and JSON-LD. Comments, scripts and styles are skipped, so markup inside the React
 * payload never counts, and `<title>` inside inline SVG icons is ignored.
 */

export type Attributes = Record<string, string>;

export interface ParsedHtml {
  lang: string | null;
  baseHref: string | null;
  titles: string[];
  metas: Attributes[];
  links: Attributes[];
  anchors: Attributes[];
  images: { src: string; alt: string | null }[];
  headings: { level: number; text: string }[];
  /** Raw contents of `<script type="application/ld+json">` blocks. */
  jsonLd: string[];
  /** Visible words (outside scripts, styles and SVG). */
  words: number;
}

/** Elements whose content is text, not markup. */
const RAW_TEXT = new Set(["script", "style", "title", "textarea", "xmp", "iframe", "noembed", "noframes"]);
/** More than this is ignored (the audit reports oversized pages separately). */
const MAX_SCAN = 4 * 1024 * 1024;
const MAX_HEADING_TEXT = 160;

const isSpace = (code: number) => code === 32 || code === 9 || code === 10 || code === 12 || code === 13;

export function parseHtml(input: string): ParsedHtml {
  const html = input.length > MAX_SCAN ? input.slice(0, MAX_SCAN) : input;
  const lower = html.toLowerCase();
  const n = html.length;
  const result: ParsedHtml = {
    lang: null,
    baseHref: null,
    titles: [],
    metas: [],
    links: [],
    anchors: [],
    images: [],
    headings: [],
    jsonLd: [],
    words: 0,
  };
  const openHeadings: { level: number; contentStart: number }[] = [];
  let svgDepth = 0;
  let sawHtmlTag = false;
  let i = 0;

  const countWords = (from: number, to: number) => {
    if (svgDepth > 0 || to <= from) return;
    const text = decodeEntities(html.slice(from, to));
    const matches = text.match(/[\p{L}\p{N}]+/gu);
    if (matches) result.words += matches.length;
  };

  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      countWords(i, n);
      break;
    }
    countWords(i, lt);
    const next = html.charCodeAt(lt + 1);

    // <!-- comment -->
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    // <!doctype>, <![CDATA[ ]]>, <?xml ?>
    if (next === 33 || next === 63) {
      const end = html.indexOf(">", lt + 2);
      i = end === -1 ? n : end + 1;
      continue;
    }
    // </closing>
    if (next === 47) {
      const end = html.indexOf(">", lt + 2);
      const name = readName(lower, lt + 2);
      i = end === -1 ? n : end + 1;
      if (name === "svg") svgDepth = Math.max(0, svgDepth - 1);
      else if (/^h[1-6]$/.test(name)) {
        const level = Number(name[1]);
        const index = openHeadings.findLastIndex((heading) => heading.level === level);
        if (index !== -1) {
          const [heading] = openHeadings.splice(index, 1);
          result.headings.push({ level, text: textContent(html.slice(heading.contentStart, lt)) });
        }
      }
      continue;
    }
    // Not a tag ("a < b"): plain text.
    if (!isAsciiLetter(next)) {
      i = lt + 1;
      continue;
    }

    const name = readName(lower, lt + 1);
    const { attributes, end, selfClosing } = readAttributes(html, lt + 1 + name.length);
    i = end;

    if (RAW_TEXT.has(name)) {
      const close = lower.indexOf(`</${name}`, end);
      const content = html.slice(end, close === -1 ? n : close);
      const after = close === -1 ? -1 : html.indexOf(">", close);
      i = close === -1 ? n : after === -1 ? n : after + 1;
      if (name === "title" && svgDepth === 0) result.titles.push(collapse(decodeEntities(content)));
      if (name === "script" && (attributes.type ?? "").trim().toLowerCase() === "application/ld+json") {
        result.jsonLd.push(content);
      }
      if (name === "textarea") countWords(end, end + content.length);
      continue;
    }

    switch (name) {
      case "html":
        if (!sawHtmlTag) {
          sawHtmlTag = true;
          result.lang = attributes.lang?.trim() || null;
        }
        break;
      case "base":
        if (result.baseHref === null && attributes.href) result.baseHref = attributes.href.trim();
        break;
      case "meta":
        result.metas.push(attributes);
        break;
      case "link":
        result.links.push(attributes);
        break;
      case "a":
      case "area":
        if (svgDepth === 0 && attributes.href !== undefined) result.anchors.push(attributes);
        break;
      case "img":
        result.images.push({
          src: (attributes.src || attributes["data-src"] || firstSrcsetUrl(attributes.srcset) || "").trim(),
          alt: attributes.alt ?? null,
        });
        break;
      case "svg":
        if (!selfClosing) svgDepth += 1;
        break;
      default:
        if (/^h[1-6]$/.test(name) && svgDepth === 0) openHeadings.push({ level: Number(name[1]), contentStart: end });
    }
  }

  // Unclosed headings still count (browsers close them implicitly).
  for (const heading of openHeadings) result.headings.push({ level: heading.level, text: "" });
  return result;
}

function isAsciiLetter(code: number) {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

/** Tag name starting at `start` (already lower-cased source). */
function readName(lower: string, start: number) {
  let end = start;
  while (end < lower.length) {
    const code = lower.charCodeAt(end);
    if (isSpace(code) || code === 47 || code === 62) break;
    end += 1;
  }
  return lower.slice(start, end);
}

function readAttributes(html: string, start: number) {
  const n = html.length;
  const attributes: Attributes = {};
  let j = start;
  let selfClosing = false;
  const set = (name: string, value: string) => {
    if (!(name in attributes)) attributes[name] = decodeEntities(value);
  };

  while (j < n) {
    while (j < n && isSpace(html.charCodeAt(j))) j += 1;
    if (j >= n) break;
    const char = html[j];
    if (char === ">") {
      j += 1;
      break;
    }
    if (char === "/") {
      if (html[j + 1] === ">") {
        selfClosing = true;
        j += 2;
        break;
      }
      j += 1;
      continue;
    }

    const nameStart = j;
    while (j < n) {
      const code = html.charCodeAt(j);
      if (isSpace(code) || code === 61 || code === 62 || code === 47) break;
      j += 1;
    }
    const name = html.slice(nameStart, j).toLowerCase();
    if (!name) {
      j += 1; // a stray "=": skip it
      continue;
    }

    let k = j;
    while (k < n && isSpace(html.charCodeAt(k))) k += 1;
    if (html[k] !== "=") {
      set(name, "");
      continue;
    }
    k += 1;
    while (k < n && isSpace(html.charCodeAt(k))) k += 1;
    const quote = html[k];
    if (quote === '"' || quote === "'") {
      const close = html.indexOf(quote, k + 1);
      set(name, html.slice(k + 1, close === -1 ? n : close));
      j = close === -1 ? n : close + 1;
    } else {
      const valueStart = k;
      while (k < n && !isSpace(html.charCodeAt(k)) && html[k] !== ">") k += 1;
      set(name, html.slice(valueStart, k));
      j = k;
    }
  }
  return { attributes, end: j, selfClosing };
}

function firstSrcsetUrl(srcset: string | undefined) {
  return srcset?.trim().split(/\s+/)[0] ?? "";
}

/** Text of a fragment: tags stripped, entities decoded, whitespace collapsed. */
export function textContent(fragment: string) {
  const text = collapse(
    decodeEntities(fragment.replace(/<(script|style)[\s\S]*?<\/\1\s*>/gi, " ").replace(/<[^>]*>/g, " ")),
  );
  return text.length > MAX_HEADING_TEXT ? `${text.slice(0, MAX_HEADING_TEXT - 1)}…` : text;
}

export function collapse(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
  deg: "°",
  times: "×",
  rarr: "→",
  larr: "←",
};

export function decodeEntities(text: string) {
  if (!text.includes("&")) return text;
  return text.replace(/&(#[xX][0-9a-fA-F]{1,6}|#\d{1,7}|[a-zA-Z][a-zA-Z0-9]{1,31});/g, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}

/** Value of the first `<meta>` whose name/property matches (case-insensitive). */
export function metaContent(metas: Attributes[], key: string): string | null {
  const wanted = key.toLowerCase();
  for (const meta of metas) {
    if (meta.name?.trim().toLowerCase() === wanted || meta.property?.trim().toLowerCase() === wanted) {
      return meta.content ?? "";
    }
  }
  return null;
}

/** `<link>` tags whose rel list contains `rel`. */
export function linksWithRel(links: Attributes[], rel: string) {
  return links.filter((link) => (link.rel ?? "").toLowerCase().split(/\s+/).includes(rel));
}

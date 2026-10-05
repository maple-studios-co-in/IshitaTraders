/** "Chrome on Windows"-style labels for a session's user agent (client-safe, no dependencies). */

const browsers: [RegExp, string][] = [
  [/HeadlessChrome\//, "Headless Chrome"],
  [/Edg(?:e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Version\/[\d.]+.*Safari\//, "Safari"],
  [/curl\//i, "curl"],
];

const systems: [RegExp, string][] = [
  [/iPhone|iPod/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows NT|Windows/, "Windows"],
  [/CrOS/, "ChromeOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

export function describeUserAgent(userAgent: string | null | undefined) {
  const ua = userAgent ?? "";
  if (!ua.trim()) return "Unknown device";
  const browser = browsers.find(([pattern]) => pattern.test(ua))?.[1];
  const system = systems.find(([pattern]) => pattern.test(ua))?.[1];
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? (system ? `Browser on ${system}` : "Unknown browser");
}

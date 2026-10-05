import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with scrypt (memory-hard, built into Node — no native addons).
 * Format: `scrypt$<N>$<r>$<p>$<salt>$<hash>` so parameters can be raised later without breaking
 * existing hashes (`needsRehash`).
 */
const PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const MAX_MEMORY = 128 * PARAMS.N * PARAMS.r * 2;

export const PASSWORD_MIN_LENGTH = 10;

function derive(password: string, salt: Buffer, params: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...params, maxmem: MAX_MEMORY * 2 }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await derive(password, Buffer.from(salt, "base64url"), { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function needsRehash(stored: string) {
  const [, n, r, p] = stored.split("$");
  return Number(n) !== PARAMS.N || Number(r) !== PARAMS.r || Number(p) !== PARAMS.p;
}

/** Shared rules for new passwords (admin-set and self-service). Returns an error message or null. */
export function passwordProblem(password: string, context: { email?: string; name?: string } = {}) {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > 200) return "That password is too long.";
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return "Mix letters and numbers.";
  const lower = password.toLowerCase();
  const email = context.email?.toLowerCase().split("@")[0];
  if (email && email.length >= 4 && lower.includes(email)) return "Don't include your email in the password.";
  if (/^(password|ishita|traders|admin|qwerty|123456)/.test(lower)) return "That password is too easy to guess.";
  return null;
}

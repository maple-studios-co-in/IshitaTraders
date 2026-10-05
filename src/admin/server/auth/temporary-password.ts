import "server-only";

import { randomInt } from "node:crypto";

import { passwordProblem } from "./password";

/** Letters and digits without look-alikes (0/O, 1/l/I), so a password read out or retyped survives. */
const LETTERS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ALPHABET = LETTERS + DIGITS;

export const TEMPORARY_PASSWORD_LENGTH = 16;

/**
 * A strong temporary password from the CSPRNG (16 characters ≈ 93 bits), always containing both
 * letters and digits so it passes `passwordProblem`. Never logged or stored in plain text.
 */
export function generateTemporaryPassword(length = TEMPORARY_PASSWORD_LENGTH): string {
  for (;;) {
    let password = "";
    for (let index = 0; index < length; index++) password += ALPHABET[randomInt(ALPHABET.length)];
    if (/[a-z]/i.test(password) && /\d/.test(password) && passwordProblem(password) === null) return password;
  }
}

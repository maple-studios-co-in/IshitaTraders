import "server-only";

import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";

import type { ActionState } from "@/admin/lib/action-state";

import { AuthError } from "./auth/guard";
import { UploadError } from "./storage";

/** A validation problem to show next to form fields. */
export class FormError extends Error {
  constructor(
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "FormError";
  }
}

/**
 * Wraps a Server Action body: success → message, known errors → friendly message, anything else
 * → logged and reported generically. Redirects and `notFound()` pass through.
 */
export async function runAction(
  fn: () => Promise<string | { message: string; data?: Record<string, unknown> } | void>,
): Promise<ActionState> {
  try {
    const result = await fn();
    if (result && typeof result === "object") {
      return { status: "success", message: result.message, data: result.data, at: Date.now() };
    }
    return { status: "success", message: result || "Saved.", at: Date.now() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof FormError) {
      return { status: "error", message: error.message, fieldErrors: error.fieldErrors, at: Date.now() };
    }
    if (error instanceof AuthError || error instanceof UploadError) {
      return { status: "error", message: error.message, at: Date.now() };
    }
    if (isUniqueViolation(error)) {
      return { status: "error", message: "Something with that name or address already exists.", at: Date.now() };
    }
    console.error("[admin action]", error);
    return { status: "error", message: "Something went wrong. Please try again.", at: Date.now() };
  }
}

/** Parses with a Zod schema, turning issues into per-field messages. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  throw new FormError("Please fix the highlighted fields.", fieldErrors);
}

function isUniqueViolation(error: unknown): boolean {
  const code =
    (error as { code?: string; cause?: { code?: string } })?.code ??
    (error as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}

/** FormData helpers: trimmed strings, checkboxes, numbers and JSON blobs from hidden inputs. */
export const formValue = {
  text: (data: FormData, key: string) => String(data.get(key) ?? "").trim(),
  bool: (data: FormData, key: string) => {
    const value = data.get(key);
    return value === "on" || value === "true" || value === "1";
  },
  int: (data: FormData, key: string) => {
    const raw = String(data.get(key) ?? "").replace(/[,\s₹]/g, "");
    if (raw === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.round(value) : Number.NaN;
  },
  json: <T>(data: FormData, key: string, fallback: T): T => {
    const raw = data.get(key);
    if (typeof raw !== "string" || raw === "") return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  list: (data: FormData, key: string) =>
    String(data.get(key) ?? "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean),
};

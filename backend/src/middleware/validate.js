/**
 * Request validation. Checks req.params / req.query / req.body against zod schemas before the
 * controller runs, and puts the parsed, typed, defaulted values on `req.valid` (Express 5 makes
 * req.query read-only, so the originals stay untouched). Every problem is reported at once in a
 * 400 response, so a client can fix them all in one go.
 */
import { badRequest } from "../lib/errors.js";

const PARTS = ["params", "query", "body"];

export function validate(schemas) {
  return (req, _res, next) => {
    const valid = {};
    const problems = [];

    for (const part of PARTS) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (result.success) {
        valid[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          problems.push({ in: part, field: issue.path.join(".") || null, message: issue.message });
        }
      }
    }

    if (problems.length > 0) {
      return next(badRequest("validation_failed", "Some values in the request are not valid.", problems));
    }
    req.valid = valid;
    next();
  };
}

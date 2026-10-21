/**
 * The last middleware: every error thrown in a route (Express 5 forwards rejected promises here
 * too) becomes one consistent JSON response:
 *
 *   { "error": { "code": "not_found", "message": "…", "details": …, "requestId": "…" } }
 *
 * Expected errors (HttpError, malformed JSON, oversized bodies) keep their status and message.
 * Anything else is a bug or an outage: it's logged in full, and the client gets a generic 500 that
 * reveals nothing about the internals.
 */
import { HttpError } from "../lib/errors.js";

function describe(error) {
  if (error instanceof HttpError) {
    return { status: error.status, code: error.code, message: error.message, details: error.details };
  }
  // Errors raised by express.json() while reading the body.
  if (error?.type === "entity.parse.failed") {
    return { status: 400, code: "invalid_json", message: "The request body is not valid JSON." };
  }
  if (error?.type === "entity.too.large") {
    return { status: 413, code: "payload_too_large", message: "The request body is too large." };
  }
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 && error.expose) {
    return { status: error.status, code: "bad_request", message: error.message };
  }
  return { status: 500, code: "internal_error", message: "Something went wrong on our side. Please try again." };
}

// Express recognises an error handler by its four parameters, so `_next` must stay.
export function errorHandler(error, req, res, _next) {
  const { status, code, message, details } = describe(error);

  if (status >= 500) req.log.error({ err: error }, "request failed");

  if (res.headersSent) return;
  if (status === 401) res.set("WWW-Authenticate", 'Bearer realm="ishita-traders-api"');
  res.set("Cache-Control", "no-store");
  res.status(status).json({
    error: { code, message, ...(details === undefined ? {} : { details }), requestId: req.id },
  });
}

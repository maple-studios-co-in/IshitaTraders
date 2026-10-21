/**
 * Errors that carry an HTTP status. Throw one anywhere in a request; the error handler turns it into
 * the API's error response: { error: { code, message, details?, requestId } }.
 */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} code stable, machine-readable error code (snake_case)
   * @param {string} message human-readable explanation
   * @param {unknown} [details] extra data, e.g. the list of invalid fields
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new HttpError(400, code, message, details);

export const notFound = (message = "Not found.") => new HttpError(404, "not_found", message);

export const unauthorized = (message = "A valid API key is required (Authorization: Bearer <key>).") =>
  new HttpError(401, "unauthorized", message);

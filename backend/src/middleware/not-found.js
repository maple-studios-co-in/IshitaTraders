/** Runs when no route matched: a JSON 404 in the API's error format (Express's default is HTML). */
import { notFound } from "../lib/errors.js";

export function notFoundHandler(req, _res, next) {
  next(notFound(`There is no ${req.method} ${req.path} endpoint.`));
}

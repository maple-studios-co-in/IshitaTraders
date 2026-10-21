// Cross-cutting behaviour: health checks, 404s, error format, security headers, CORS, request ids.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ALLOWED_ORIGIN, api } from "./helpers.js";

describe("health checks", () => {
  it("GET /health answers without touching the database", async () => {
    const res = await api().get("/health").expect(200);
    assert.equal(res.body.status, "ok");
    assert.equal(typeof res.body.uptimeSeconds, "number");
    assert.equal(res.headers["cache-control"], "no-store");
  });

  it("GET /health/ready reports the database", async () => {
    const res = await api().get("/health/ready").expect(200);
    assert.equal(res.body.status, "ok");
    assert.equal(res.body.database.status, "ok");
  });
});

describe("API basics", () => {
  it("GET /api/v1 lists the endpoints", async () => {
    const res = await api().get("/api/v1").expect(200);
    assert.equal(res.body.version, "v1");
    assert.equal(res.body.endpoints.products, "/api/v1/products");
  });

  it("unknown routes get a JSON 404 in the error format, with the request id", async () => {
    const res = await api().get("/api/v1/nope").expect(404);
    assert.equal(res.body.error.code, "not_found");
    assert.match(res.body.error.message, /GET \/api\/v1\/nope/);
    assert.equal(res.body.error.requestId, res.headers["x-request-id"]);
    assert.equal(res.headers["cache-control"], "no-store");
  });

  it("keeps a caller's X-Request-Id and invents one otherwise", async () => {
    const kept = await api().get("/health").set("X-Request-Id", "trace-123").expect(200);
    assert.equal(kept.headers["x-request-id"], "trace-123");
    const invented = await api().get("/health").set("X-Request-Id", "bad id!").expect(200);
    assert.match(invented.headers["x-request-id"], /^[0-9a-f-]{36}$/);
  });

  it("rejects malformed JSON with a 400", async () => {
    const res = await api()
      .post("/api/v1/enquiries")
      .set("Content-Type", "application/json")
      .send('{"name": "broken"')
      .expect(400);
    assert.equal(res.body.error.code, "invalid_json");
  });

  it("rejects bodies over 100 kB with a 413", async () => {
    const res = await api()
      .post("/api/v1/enquiries")
      .send({ message: "x".repeat(110_000) })
      .expect(413);
    assert.equal(res.body.error.code, "payload_too_large");
  });
});

describe("security headers", () => {
  it("sets helmet's headers and hides the framework", async () => {
    const res = await api().get("/health");
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.equal(res.headers["cross-origin-resource-policy"], "cross-origin");
    assert.ok(res.headers["strict-transport-security"]);
    assert.equal(res.headers["x-powered-by"], undefined);
  });
});

describe("CORS", () => {
  it("allows the configured website", async () => {
    const res = await api().get("/api/v1/brands").set("Origin", ALLOWED_ORIGIN).expect(200);
    assert.equal(res.headers["access-control-allow-origin"], ALLOWED_ORIGIN);
  });

  it("gives other websites no CORS permission", async () => {
    const res = await api().get("/api/v1/brands").set("Origin", "https://evil.example").expect(200);
    assert.equal(res.headers["access-control-allow-origin"], undefined);
  });

  it("answers preflight requests for the allowed website", async () => {
    const res = await api()
      .options("/api/v1/enquiries")
      .set("Origin", ALLOWED_ORIGIN)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");
    assert.equal(res.status, 204);
    assert.equal(res.headers["access-control-allow-origin"], ALLOWED_ORIGIN);
    assert.match(res.headers["access-control-allow-methods"], /POST/);
  });
});

// FAQs and testimonials: published only, samples hidden unless asked for.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { api } from "./helpers.js";

describe("GET /api/v1/faqs", () => {
  it("lists published FAQs in admin order", async () => {
    const res = await api().get("/api/v1/faqs").expect(200);
    assert.deepEqual(
      res.body.data.map((faq) => faq.question),
      ["Do you install solar panels?", "What warranty do batteries carry?"],
    );
    assert.match(res.headers["cache-control"], /^public, max-age=300/);
  });
});

describe("GET /api/v1/testimonials", () => {
  it("leaves sample testimonials out by default", async () => {
    const res = await api().get("/api/v1/testimonials").expect(200);
    assert.deepEqual(
      res.body.data.map((item) => item.name),
      ["Mamta Verma"],
    );
    assert.deepEqual(res.body.data[0].badge, { kind: "installation", label: "" });
  });

  it("includes samples when asked", async () => {
    const res = await api().get("/api/v1/testimonials?includeSamples=true").expect(200);
    assert.deepEqual(
      res.body.data.map((item) => [item.name, item.isSample]),
      [
        ["Mamta Verma", false],
        ["Sample client 01", true],
      ],
    );
  });

  it("validates its parameters", async () => {
    await api().get("/api/v1/testimonials?limit=0").expect(400);
  });
});

// Enquiries: validation, storage in the admin's table, product links, honeypot, rate limit, admin API.
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { ADMIN_KEY, api, query, resetEnquiries } from "./helpers.js";

const valid = {
  name: "Ravi Kumar",
  phone: "+91 98765 43210",
  email: "Ravi@Example.com",
  subject: "Solar",
  message: "Need a 3kW rooftop system quote.",
  productSlug: "utl-solar-inverter-3kva",
  pageUrl: "https://ishita-traders.vercel.app/products",
  utm: { source: "google", medium: "cpc" },
};

const createEnquiry = (body) => api().post("/api/v1/enquiries").send(body);

describe("POST /api/v1/enquiries", () => {
  beforeEach(resetEnquiries);

  it("stores a valid enquiry where the admin reads them", async () => {
    const res = await createEnquiry(valid).set("User-Agent", "test-agent").expect(201);
    assert.equal(res.body.data.status, "received");
    assert.match(res.body.data.id, /^[0-9a-f-]{36}$/);
    assert.equal(res.headers["cache-control"], "no-store");

    const { rows } = await query("SELECT * FROM enquiries WHERE id = $1", [res.body.data.id]);
    const row = rows[0];
    assert.equal(row.form_key, "api");
    assert.equal(row.form_name, "API enquiry");
    assert.equal(row.status, "new");
    assert.equal(row.phone, "+919876543210", "spaces removed, like the website");
    assert.equal(row.email, "ravi@example.com", "lower-cased");
    assert.equal(row.message, "Solar: Need a 3kW rooftop system quote.");
    assert.equal(row.product_name, "UTL Solar Inverter 3kVA");
    assert.ok(row.product_id);
    assert.deepEqual(row.utm, { source: "google", medium: "cpc" });
    assert.equal(row.user_agent, "test-agent");
    assert.match(row.ip_hash, /^[0-9a-f]{32}$/, "only a hash of the IP is kept");
    assert.deepEqual(
      row.fields.map((field) => field.key),
      ["name", "phone", "email", "subject", "product", "message"],
    );
  });

  it("needs only a name, a phone number and a message", async () => {
    await createEnquiry({ name: "Asha", phone: "9876543210", message: "Please call me back." }).expect(201);
  });

  it("lists every invalid field at once", async () => {
    const res = await createEnquiry({ name: "", phone: "12345", email: "nope", message: "short" }).expect(400);
    assert.equal(res.body.error.code, "validation_failed");
    assert.deepEqual(res.body.error.details.map((detail) => detail.field).sort(), [
      "email",
      "message",
      "name",
      "phone",
    ]);
    const phone = res.body.error.details.find((detail) => detail.field === "phone");
    assert.equal(phone.message, "Please enter a valid 10-digit mobile number.");
  });

  it("refuses unknown or unpublished products", async () => {
    const unknown = await createEnquiry({ ...valid, productSlug: "no-such-product" }).expect(400);
    assert.equal(unknown.body.error.code, "unknown_product");
    await createEnquiry({ ...valid, productSlug: "exide-draft-product" }).expect(400);
  });

  it("quietly drops honeypot submissions", async () => {
    const res = await createEnquiry({ ...valid, website: "http://spam.example" }).expect(201);
    assert.equal(res.body.data.status, "received");
    const { rows } = await query("SELECT count(*) AS total FROM enquiries");
    assert.equal(rows[0].total, 0);
  });

  it("limits enquiries per visitor (3 per window in the test settings)", async () => {
    for (let attempt = 1; attempt <= 3; attempt++) await createEnquiry(valid).expect(201);
    const res = await createEnquiry(valid).expect(429);
    assert.equal(res.body.error.code, "too_many_requests");
    assert.ok(Number(res.headers["retry-after"]) > 0);
    assert.ok(res.headers["ratelimit"]);
    const { rows } = await query("SELECT key FROM rate_limits");
    assert.match(rows[0].key, /^api:enquiry:[0-9a-f]{32}$/, "counted per hashed visitor");
  });
});

describe("admin enquiry API", () => {
  beforeEach(resetEnquiries);

  const admin = (method, path) => api()[method](`/api/v1/admin${path}`).set("Authorization", `Bearer ${ADMIN_KEY}`);

  it("requires the API key", async () => {
    const missing = await api().get("/api/v1/admin/enquiries").expect(401);
    assert.equal(missing.body.error.code, "unauthorized");
    assert.match(missing.headers["www-authenticate"], /^Bearer/);
    await api().get("/api/v1/admin/enquiries").set("Authorization", "Bearer wrong-key").expect(401);
    await api().get("/api/v1/admin/enquiries").set("Authorization", ADMIN_KEY).expect(401);
  });

  it("lists, filters and reads enquiries", async () => {
    const created = await createEnquiry(valid).expect(201);
    await createEnquiry({ name: "Asha", phone: "9876543210", message: "Battery for my shop, please." }).expect(201);

    const list = await admin("get", "/enquiries").expect(200);
    assert.equal(list.body.meta.total, 2);
    assert.equal(list.body.data[0].name, "Asha", "newest first");
    assert.equal(list.headers["cache-control"], "no-store");

    const search = await admin("get", "/enquiries?q=rooftop").expect(200);
    assert.deepEqual(
      search.body.data.map((enquiry) => enquiry.name),
      ["Ravi Kumar"],
    );

    const one = await admin("get", `/enquiries/${created.body.data.id}`).expect(200);
    assert.deepEqual(one.body.data.form, { key: "api", name: "API enquiry" });
    assert.equal(one.body.data.product.name, "UTL Solar Inverter 3kVA");
    assert.equal(one.body.data.ipHash, undefined, "the IP hash stays internal");
  });

  it("updates status and read flag", async () => {
    const created = await createEnquiry(valid).expect(201);
    const res = await admin("patch", `/enquiries/${created.body.data.id}`)
      .send({ status: "contacted", isRead: true })
      .expect(200);
    assert.equal(res.body.data.status, "contacted");
    assert.equal(res.body.data.isRead, true);

    const unread = await admin("get", "/enquiries?unread=true").expect(200);
    assert.equal(unread.body.meta.total, 0);
  });

  it("validates ids and updates", async () => {
    await admin("get", "/enquiries/not-a-uuid").expect(400);
    await admin("get", "/enquiries/00000000-0000-4000-8000-00000000ffff").expect(404);
    const created = await createEnquiry(valid).expect(201);
    const empty = await admin("patch", `/enquiries/${created.body.data.id}`).send({}).expect(400);
    assert.equal(empty.body.error.details[0].message, "Send at least one of: status, isRead.");
    await admin("patch", `/enquiries/${created.body.data.id}`).send({ status: "archived" }).expect(400);
  });
});

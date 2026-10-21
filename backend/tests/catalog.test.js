// Brands, categories and products: visibility rules, filters, pagination, prices, images, 404s.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { api } from "./helpers.js";

describe("GET /api/v1/brands", () => {
  it("lists active brands in admin order, with published product counts", async () => {
    const res = await api().get("/api/v1/brands").expect(200);
    assert.deepEqual(
      res.body.data.map((brand) => [brand.slug, brand.productCount]),
      [
        ["exide", 2],
        ["utl", 2],
      ],
    );
    assert.equal(res.body.data[0].tabLabel, "EXIDE Catalogue");
    assert.equal(res.body.data[1].tabLabel, "UTL Solar Catalogue", "falls back to '<name> Catalogue'");
    assert.match(res.headers["cache-control"], /^public, max-age=60/);
  });

  it("returns one brand by slug", async () => {
    const res = await api().get("/api/v1/brands/utl").expect(200);
    assert.equal(res.body.data.name, "UTL Solar");
  });

  it("hides inactive brands and unknown slugs behind a 404", async () => {
    await api().get("/api/v1/brands/retired").expect(404);
    await api().get("/api/v1/brands/missing").expect(404);
  });

  it("rejects malformed slugs with a 400", async () => {
    const res = await api().get("/api/v1/brands/Not_A_Slug!").expect(400);
    assert.equal(res.body.error.code, "validation_failed");
    assert.equal(res.body.error.details[0].field, "slug");
  });
});

describe("GET /api/v1/categories", () => {
  it("lists every category with its published product count", async () => {
    const res = await api().get("/api/v1/categories").expect(200);
    assert.deepEqual(
      res.body.data.map((category) => [category.slug, category.productCount]),
      [
        ["batteries", 3],
        ["inverters", 2],
        ["solar-panels", 0],
      ],
    );
    assert.equal(res.body.data[0].enquirySubject, "batteries");
  });
});

describe("GET /api/v1/products", () => {
  it("lists published products only, in admin order, with pagination meta", async () => {
    const res = await api().get("/api/v1/products").expect(200);
    assert.deepEqual(
      res.body.data.map((product) => product.slug),
      [
        "exide-tubular-150ah",
        "exide-home-inverter-900va",
        "utl-solar-inverter-3kva",
        "utl-gamma-battery",
        "legacy-battery",
      ],
    );
    assert.deepEqual(res.body.meta, { page: 1, limit: 12, total: 5, totalPages: 1 });
  });

  it("keeps products of retired brands, like the website does", async () => {
    const res = await api().get("/api/v1/products").expect(200);
    const legacy = res.body.data.find((product) => product.slug === "legacy-battery");
    assert.deepEqual(legacy.brand, { slug: "retired", name: "Retired Brand" });
  });

  it("pages through results", async () => {
    const res = await api().get("/api/v1/products?limit=2&page=2").expect(200);
    assert.deepEqual(
      res.body.data.map((product) => product.slug),
      ["utl-solar-inverter-3kva", "utl-gamma-battery"],
    );
    assert.deepEqual(res.body.meta, { page: 2, limit: 2, total: 5, totalPages: 3 });
  });

  it("filters by brand, category (one or several) and featured", async () => {
    const byBrand = await api().get("/api/v1/products?brand=utl").expect(200);
    assert.equal(byBrand.body.meta.total, 2);

    const byCategory = await api().get("/api/v1/products?category=inverters").expect(200);
    assert.deepEqual(
      byCategory.body.data.map((product) => product.slug),
      ["exide-home-inverter-900va", "utl-solar-inverter-3kva"],
    );

    const both = await api().get("/api/v1/products?category=inverters,solar-panels&brand=exide").expect(200);
    assert.deepEqual(
      both.body.data.map((product) => product.slug),
      ["exide-home-inverter-900va"],
    );

    const repeated = await api().get("/api/v1/products?category=batteries&category=inverters").expect(200);
    assert.equal(repeated.body.meta.total, 5);

    const featured = await api().get("/api/v1/products?featured=true").expect(200);
    assert.deepEqual(
      featured.body.data.map((product) => product.slug),
      ["exide-tubular-150ah"],
    );
  });

  it("searches names, SKUs, brands and applications; every word must match", async () => {
    const solar = await api().get("/api/v1/products?q=solar").expect(200);
    assert.deepEqual(
      solar.body.data.map((product) => product.slug),
      ["utl-solar-inverter-3kva", "utl-gamma-battery"],
      "matches the name, and the brand name 'UTL Solar'",
    );

    const twoWords = await api().get("/api/v1/products?q=exide%20900va").expect(200);
    assert.deepEqual(
      twoWords.body.data.map((product) => product.slug),
      ["exide-home-inverter-900va"],
    );
    const noneHasBoth = await api().get("/api/v1/products?q=utl%20900va").expect(200);
    assert.equal(noneHasBoth.body.meta.total, 0);

    const sku = await api().get("/api/v1/products?q=ex-tb150").expect(200);
    assert.equal(sku.body.data[0].slug, "exide-tubular-150ah");
  });

  it("treats % and _ in a search as plain characters", async () => {
    const percent = await api().get("/api/v1/products?q=100%25").expect(200);
    assert.deepEqual(
      percent.body.data.map((product) => product.slug),
      ["utl-gamma-battery"],
    );
    const underscore = await api().get("/api/v1/products?q=_").expect(200);
    assert.equal(underscore.body.meta.total, 0);
  });

  it("sorts by name or newest", async () => {
    const byName = await api().get("/api/v1/products?sort=name").expect(200);
    assert.equal(byName.body.data[0].slug, "exide-home-inverter-900va");
  });

  it("shows prices only where the admin chose to", async () => {
    const res = await api().get("/api/v1/products").expect(200);
    const shown = res.body.data.find((product) => product.slug === "exide-tubular-150ah");
    const hidden = res.body.data.find((product) => product.slug === "exide-home-inverter-900va");
    assert.deepEqual(shown.price, { amount: 15500, mrp: 18000, currency: "INR", note: "" });
    assert.equal(hidden.price, null);
  });

  it("explains invalid query values", async () => {
    const res = await api().get("/api/v1/products?limit=500&sort=cheapest&featured=maybe").expect(400);
    assert.deepEqual(res.body.error.details.map((detail) => detail.field).sort(), ["featured", "limit", "sort"]);
  });
});

describe("GET /api/v1/products/:slug", () => {
  it("returns the full product, with media URLs made absolute", async () => {
    const res = await api().get("/api/v1/products/exide-home-inverter-900va").expect(200);
    const product = res.body.data;
    assert.equal(product.name, "Exide Home Inverter 900VA");
    assert.deepEqual(product.brand, { slug: "exide", name: "Exide" });
    assert.deepEqual(product.image, {
      url: "https://ishita.example/media/m1/inverter.webp",
      alt: "Inverter",
      width: 800,
      height: 600,
    });
    assert.deepEqual(product.datasheet, {
      url: "https://ishita.example/media/d1/datasheet.pdf",
      name: "datasheet.pdf",
      size: 12345,
    });
    assert.deepEqual(product.specs, []);
    assert.deepEqual(product.seo, { title: "", description: "" });
  });

  it("describes bundled website images without a URL", async () => {
    const res = await api().get("/api/v1/products/exide-tubular-150ah").expect(200);
    assert.deepEqual(res.body.data.image, { url: null, key: "products/exide-tubular", alt: "Exide tubular battery" });
  });

  it("404s for unpublished and unknown products", async () => {
    await api().get("/api/v1/products/exide-draft-product").expect(404);
    const res = await api().get("/api/v1/products/no-such-product").expect(404);
    assert.equal(res.body.error.message, "No published product with that slug.");
  });
});

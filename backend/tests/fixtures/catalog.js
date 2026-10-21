/**
 * A small, fixed catalogue for the tests: each row exists to exercise one rule (published or not,
 * active brand or not, price shown or hidden, static vs uploaded images, sample testimonials).
 */
export const ids = {
  exide: "00000000-0000-4000-8000-000000000001",
  utl: "00000000-0000-4000-8000-000000000002",
  retired: "00000000-0000-4000-8000-000000000003",
  batteries: "00000000-0000-4000-8000-000000000011",
  inverters: "00000000-0000-4000-8000-000000000012",
  solarPanels: "00000000-0000-4000-8000-000000000013",
};

const brands = [
  { id: ids.exide, slug: "exide", name: "Exide", tab_label: "EXIDE Catalogue", is_active: true, sort_order: 0 },
  { id: ids.utl, slug: "utl", name: "UTL Solar", tab_label: "", is_active: true, sort_order: 1 },
  { id: ids.retired, slug: "retired", name: "Retired Brand", tab_label: "", is_active: false, sort_order: 2 },
];

const categories = [
  { id: ids.batteries, slug: "batteries", name: "Batteries", sort_order: 0 },
  { id: ids.inverters, slug: "inverters", name: "Inverters", sort_order: 1 },
  { id: ids.solarPanels, slug: "solar-panels", name: "Solar Panels", sort_order: 2 },
];

const products = [
  {
    slug: "exide-tubular-150ah",
    sku: "EX-TB150",
    name: "Exide Tubular 150Ah",
    brand_id: ids.exide,
    category_id: ids.batteries,
    summary: "Long-life tubular battery for home inverters.",
    image: { kind: "static", key: "products/exide-tubular", alt: "Exide tubular battery" },
    applications: ["Home backup"],
    mrp: 18000,
    price: 15500,
    show_price: true,
    is_featured: true,
    sort_order: 0,
  },
  {
    slug: "exide-home-inverter-900va",
    sku: "EX-HI900",
    name: "Exide Home Inverter 900VA",
    brand_id: ids.exide,
    category_id: ids.inverters,
    summary: "Pure sine wave home inverter.",
    image: {
      kind: "media",
      id: "m1",
      url: "/media/m1/inverter.webp",
      width: 800,
      height: 600,
      blurDataUrl: null,
      alt: "Inverter",
    },
    datasheet: { mediaId: "d1", url: "/media/d1/datasheet.pdf", name: "datasheet.pdf", size: 12345 },
    applications: ["Home backup", "Shops"],
    price: 6000,
    show_price: false,
    sort_order: 1,
  },
  {
    slug: "utl-solar-inverter-3kva",
    sku: "UTL-SI3",
    name: "UTL Solar Inverter 3kVA",
    brand_id: ids.utl,
    category_id: ids.inverters,
    summary: "MPPT solar inverter for rooftops.",
    applications: ["Solar", "Office"],
    sort_order: 2,
  },
  {
    slug: "utl-gamma-battery",
    sku: "UTL-G100",
    name: "UTL Gamma Battery 100% Safe",
    brand_id: ids.utl,
    category_id: ids.batteries,
    summary: "Sealed battery.",
    sort_order: 3,
  },
  {
    slug: "exide-draft-product",
    name: "Exide Draft Product",
    brand_id: ids.exide,
    category_id: ids.batteries,
    is_published: false,
    sort_order: 4,
  },
  {
    slug: "legacy-battery",
    name: "Legacy Battery",
    brand_id: ids.retired,
    category_id: ids.batteries,
    sort_order: 5,
  },
];

const faqs = [
  { question: "Do you install solar panels?", answer: "Yes, across Bihar.", sort_order: 0 },
  { question: "What warranty do batteries carry?", answer: "", sort_order: 1 },
  { question: "Draft question", answer: "Hidden", is_published: false, sort_order: 2 },
];

const testimonials = [
  { name: "Mamta Verma", location: "Chakia", quote: "Great service.", rating: 5, sort_order: 0 },
  { name: "Sample client 01", location: "Town", quote: "Sample testimonial.", is_sample: true, sort_order: 1 },
  { name: "Unpublished", location: "", quote: "Hidden.", is_published: false, sort_order: 2 },
];

/** Inserts one row per object; columns come from the object's keys, jsonb values as JSON text. */
async function insertAll(client, table, rows, jsonColumns = []) {
  for (const row of rows) {
    const columns = Object.keys(row);
    const values = columns.map((column) => (jsonColumns.includes(column) ? JSON.stringify(row[column]) : row[column]));
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    await client.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`, values);
  }
}

export async function loadFixtures(client) {
  await insertAll(client, "brands", brands);
  await insertAll(client, "categories", categories);
  await insertAll(client, "products", products, ["image", "datasheet"]);
  await insertAll(client, "faqs", faqs);
  await insertAll(client, "testimonials", testimonials);
}

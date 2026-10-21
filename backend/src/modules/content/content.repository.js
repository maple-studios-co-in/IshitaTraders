/** SQL for the published FAQs and testimonials. */
import { query } from "../../db/pool.js";

export async function listFaqs() {
  const { rows } = await query(
    `SELECT id, question, answer FROM faqs WHERE is_published ORDER BY sort_order, created_at`,
  );
  return rows;
}

/** Sample testimonials are placeholders made for the design; they're left out unless asked for. */
export async function listTestimonials({ includeSamples, limit }) {
  const { rows } = await query(
    `SELECT id, name, location, quote, rating, badge_kind, badge_label, avatar, is_sample
     FROM testimonials
     WHERE is_published AND ($1 OR NOT is_sample)
     ORDER BY sort_order, created_at
     LIMIT $2`,
    [includeSamples, limit],
  );
  return rows;
}

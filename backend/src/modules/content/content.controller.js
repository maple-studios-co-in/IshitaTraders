/** FAQ and testimonial request handlers. */
import { image } from "../../lib/media.js";
import * as content from "./content.repository.js";

export async function listFaqs(_req, res) {
  const rows = await content.listFaqs();
  res.json({ data: rows.map((row) => ({ id: row.id, question: row.question, answer: row.answer })) });
}

export async function listTestimonials(req, res) {
  const rows = await content.listTestimonials(req.valid.query);
  res.json({
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      location: row.location,
      quote: row.quote,
      rating: row.rating,
      badge: { kind: row.badge_kind, label: row.badge_label },
      avatar: image(row.avatar),
      isSample: row.is_sample,
    })),
  });
}

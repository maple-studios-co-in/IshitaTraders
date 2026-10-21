/** Enquiry request handlers: public create, and the admin's list / read / update. */
import { notFound } from "../../lib/errors.js";
import * as enquiries from "./enquiries.repository.js";
import { toEnquiry } from "./enquiries.serializers.js";
import { createEnquiry } from "./enquiries.service.js";

export async function create(req, res) {
  const result = await createEnquiry(req.valid.body, {
    ip: req.ip ?? "",
    userAgent: req.get("user-agent") ?? "",
    referrer: req.get("referer") ?? "",
  });
  res.status(201).json({
    data: { id: result.id, status: "received", createdAt: result.createdAt },
    message: "Thank you! Your enquiry has been received — our team will get back to you shortly.",
  });
}

export async function list(req, res) {
  const filters = req.valid.query;
  const { rows, total } = await enquiries.listEnquiries(filters);
  res.json({
    data: rows.map(toEnquiry),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  });
}

export async function get(req, res) {
  const row = await enquiries.findEnquiryById(req.valid.params.id);
  if (!row) throw notFound("No enquiry with that id.");
  res.json({ data: toEnquiry(row) });
}

export async function update(req, res) {
  const row = await enquiries.updateEnquiry(req.valid.params.id, req.valid.body);
  if (!row) throw notFound("No enquiry with that id.");
  res.json({ data: toEnquiry(row) });
}

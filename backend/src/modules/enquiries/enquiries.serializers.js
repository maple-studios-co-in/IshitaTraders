/** An enquiry as the admin endpoints return it. The visitor's IP hash stays internal. */
export function toEnquiry(row) {
  return {
    id: row.id,
    form: { key: row.form_key, name: row.form_name },
    status: row.status,
    isRead: row.is_read,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    message: row.message,
    fields: row.fields,
    product: row.product_id ? { id: row.product_id, name: row.product_name } : null,
    pageUrl: row.page_url,
    referrer: row.referrer,
    utm: row.utm,
    userAgent: row.user_agent,
    followUpAt: row.follow_up_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

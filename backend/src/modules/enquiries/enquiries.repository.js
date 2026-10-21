/** SQL for the `enquiries` table — the same table the website's admin lists under Enquiries. */
import { query } from "../../db/pool.js";

export async function findPublishedProduct(slug) {
  const { rows } = await query("SELECT id, name FROM products WHERE slug = $1 AND is_published", [slug]);
  return rows[0] ?? null;
}

/** jsonb values are sent as JSON text: pg would turn a JS array into a Postgres array otherwise. */
export async function insertEnquiry(values) {
  const { rows } = await query(
    `INSERT INTO enquiries
       (form_key, form_name, name, email, phone, company, message, fields,
        product_id, product_name, page_url, referrer, utm, user_agent, ip_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13::jsonb, $14, $15)
     RETURNING id, created_at`,
    [
      values.formKey,
      values.formName,
      values.name,
      values.email,
      values.phone,
      values.company,
      values.message,
      JSON.stringify(values.fields),
      values.productId,
      values.productName,
      values.pageUrl,
      values.referrer,
      JSON.stringify(values.utm),
      values.userAgent,
      values.ipHash,
    ],
  );
  return rows[0];
}

const COLUMNS = `id, form_key, form_name, status, is_read, name, email, phone, company, message, fields,
  product_id, product_name, page_url, referrer, utm, user_agent, follow_up_at, created_at, updated_at`;

export async function listEnquiries({ status, form, q, unread, page, limit }) {
  const conditions = [];
  const params = [];
  const param = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (status) conditions.push(`status = ${param(status)}`);
  if (form) conditions.push(`form_key = ${param(form)}`);
  if (unread !== undefined) conditions.push(`is_read = ${param(!unread)}`);
  if (q) {
    const pattern = param(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
    conditions.push(
      `(name ILIKE ${pattern} OR email ILIKE ${pattern} OR phone ILIKE ${pattern} OR message ILIKE ${pattern})`,
    );
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const [countResult, pageResult] = await Promise.all([
    query(`SELECT count(*) AS total FROM enquiries ${where}`, params),
    query(
      `SELECT ${COLUMNS} FROM enquiries ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    ),
  ]);
  return { rows: pageResult.rows, total: countResult.rows[0].total };
}

export async function findEnquiryById(id) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM enquiries WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Changes only what was sent: COALESCE keeps the current value when a parameter is NULL. */
export async function updateEnquiry(id, { status, isRead }) {
  const { rows } = await query(
    `UPDATE enquiries
     SET status = COALESCE($2, status), is_read = COALESCE($3, is_read), updated_at = now()
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [id, status ?? null, isRead ?? null],
  );
  return rows[0] ?? null;
}

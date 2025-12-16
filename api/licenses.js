import { requireAdmin } from "./_auth.js";
import { sbFetch } from "./_supabase.js";

export default async function handler(req, res) {
  try {
    requireAdmin(req);
    if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });

    const search = (req.query?.search || "").trim();

    const query = {
      select: "*",
      order: "activated_at.desc.nullslast",
      limit: "200",
    };

    if (search) {
      query.or = `(license_key.ilike.*${search}*,notes.ilike.*${search}*)`;
    }

    const {
      res: sbRes,
      text,
      json,
    } = await sbFetch("/rest/v1/licenses", { method: "GET", query });

    if (sbRes.status !== 200)
      return res.status(500).json({ error: "Load failed", detail: text });

    return res.status(200).json({ ok: true, data: json || [] });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ error: e.message || String(e) });
  }
}

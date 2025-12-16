import { requireAdmin } from "./_auth.js";
import { sbFetch } from "./_supabase.js";

export default async function handler(req, res) {
  try {
    requireAdmin(req);
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    const { license_key } = req.body || {};
    if (!license_key)
      return res.status(400).json({ error: "Missing license_key" });

    const { res: sbRes, text } = await sbFetch("/rest/v1/licenses", {
      method: "PATCH",
      query: { license_key: `eq.${license_key}` },
      body: { status: "banned", device_id: null },
      extraHeaders: { Prefer: "return=representation" },
    });

    if (sbRes.status !== 200)
      return res.status(500).json({ error: "Ban failed", detail: text });
    return res.status(200).json({ ok: true });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ error: e.message || String(e) });
  }
}

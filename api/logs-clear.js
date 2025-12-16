import { requireAdmin } from "./_auth.js";
import { sbFetch } from "./_supabase.js";

export default async function handler(req, res) {
  try {
    requireAdmin(req);
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    // DELETE ALL ROWS
    const { res: sbRes, text } = await sbFetch("/rest/v1/activations_log", {
      method: "DELETE",
      query: {
        id: "gte.0", // WAJIB agar Supabase izinkan DELETE ALL
      },
    });

    if (sbRes.status !== 204) {
      return res.status(500).json({
        error: "Failed to clear logs",
        detail: text,
      });
    }

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}

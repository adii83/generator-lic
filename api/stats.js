import { requireAdmin } from "./_auth.js";
import { sbFetch } from "./_supabase.js";

export default async function handler(req, res) {
  try {
    requireAdmin(req);

    const { res: sbRes, json, text } = await sbFetch("/rest/v1/licenses", {
      query: { select: "status" },
      extraHeaders: { Prefer: "count=none" },
    });

    if (!sbRes || sbRes.status < 200 || sbRes.status >= 300) {
      return res.status(500).json({ error: text || "Stats query failed" });
    }

    const rows = Array.isArray(json) ? json : [];
    const stats = { active: 0, unused: 0, banned: 0 };

    rows.forEach((row) => {
      if (row.status === "active") stats.active += 1;
      else if (row.status === "banned") stats.banned += 1;
      else stats.unused += 1;
    });

    const total = rows.length;

    return res.json({
      ok: true,
      active: stats.active,
      unused: stats.unused,
      banned: stats.banned,
      total,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Stats failed" });
  }
}

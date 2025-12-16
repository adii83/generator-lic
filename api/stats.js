import { requireAdmin } from "./_auth.js";
import { sbFetch } from "./_supabase.js";

export default async function handler(req, res) {
  try {
    requireAdmin(req);

    const { res: sbRes, json, text } = await sbFetch("/rest/v1/licenses", {
      query: { select: "status,count=id", group: "status" },
      extraHeaders: { Prefer: "count=exact" },
    });

    if (!sbRes || sbRes.status < 200 || sbRes.status >= 300) {
      return res.status(500).json({ error: text || "Stats query failed" });
    }

    const rows = Array.isArray(json) ? json : [];
    const stats = { active: 0, unused: 0, banned: 0 };
    let total = 0;

    rows.forEach((row) => {
      const c = Number(row.count) || 0;
      total += c;
      if (row.status === "active") stats.active += c;
      else if (row.status === "banned") stats.banned += c;
      else stats.unused += c;
    });

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

import { requireAdmin } from "./_auth.js";
import { sbFetch } from "./_supabase.js";

export default async function handler(req, res) {
  try {
    requireAdmin(req);

    const { json: data } = await sbFetch("/rest/v1/licenses", {
      query: { select: "status" },
    });

    const stats = { active: 0, unused: 0, banned: 0 };
    (data || []).forEach((l) => {
      if (l.status === "active") stats.active++;
      else if (l.status === "banned") stats.banned++;
      else stats.unused++;
    });

    return res.json({
      ok: true,
      active: stats.active,
      unused: stats.unused,
      banned: stats.banned,
      total: data.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

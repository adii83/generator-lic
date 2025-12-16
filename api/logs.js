import { requireAdmin } from "./_auth.js";
import { sbFetch } from "./_supabase.js";

export default async function handler(req, res) {
  try {
    requireAdmin(req);
    if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });

    const search = (req.query?.search || "").trim();
    const action = (req.query?.action || "All").trim(); // activate_success/activate_failed/All
    const reason = (req.query?.reason || "All").trim(); // banned/wrong_device/license_not_found/other/All
    const result = (req.query?.result || "All").trim(); // All/Success/Failed/Banned

    const page = Math.max(1, parseInt(req.query?.page || "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(100, parseInt(req.query?.pageSize || "25", 10))
    );

    const query = {
      select: "*",
      order: "timestamp.desc",
      limit: String(pageSize),
      offset: String((page - 1) * pageSize),
    };

    // search OR
    const orClauses = [];
    if (search) {
      orClauses.push(`license_key.ilike.*${search}*`);
      orClauses.push(`device_id.ilike.*${search}*`);
      orClauses.push(`reason.ilike.*${search}*`);
    }
    if (orClauses.length) query.or = `(${orClauses.join(",")})`;

    // direct filters
    if (action !== "All") query.action = `eq.${action}`;
    if (reason !== "All") query.reason = `eq.${reason}`;

    // result override (sesuai python)
    if (result === "Success") query.action = "eq.activate_success";
    if (result === "Failed") query.action = "eq.activate_failed";
    if (result === "Banned") query.reason = "eq.banned";

    const {
      res: sbRes,
      text,
      json,
    } = await sbFetch("/rest/v1/activations_log", {
      method: "GET",
      query,
      extraHeaders: { Prefer: "count=exact" },
    });

    if (sbRes.status !== 200)
      return res.status(500).json({ error: "Load logs failed", detail: text });

    // parse Content-Range "0-24/123"
    const contentRange = sbRes.headers.get("content-range") || "";
    let totalCount = null;
    if (contentRange.includes("/")) {
      const t = contentRange.split("/").pop();
      totalCount = t ? parseInt(t, 10) : null;
    }

    const totalPages = totalCount
      ? Math.max(1, Math.ceil(totalCount / pageSize))
      : 1;

    const rows = Array.isArray(json) ? json : [];
    const data = rows.map((row) => ({
      ...row,
      time: row.time ?? row.timestamp ?? row.created_at ?? null,
    }));

    return res.status(200).json({
      ok: true,
      data,
      page,
      pageSize,
      totalCount,
      totalPages,
    });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ error: e.message || String(e) });
  }
}

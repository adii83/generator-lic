import crypto from "crypto";
import { requireAdmin } from "./_auth.js";
import { sbFetch } from "./_supabase.js";

function generateLicenseKey({
  prefix = "GHUB",
  blocks = 3,
  blockLen = 4,
} = {}) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const parts = [];
  for (let i = 0; i < blocks; i++) {
    let part = "";
    for (let j = 0; j < blockLen; j++) {
      const idx = crypto.randomInt(0, chars.length);
      part += chars[idx];
    }
    parts.push(part);
  }
  return `${prefix}-${parts.join("-")}`;
}

export default async function handler(req, res) {
  try {
    requireAdmin(req);
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    const { plan, notes, amount } = req.body || {};
    const n = Math.max(1, Math.min(200, parseInt(amount || 1, 10)));

    if (!plan || !["premium", "standard"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const keys = [];
    for (let i = 0; i < n; i++) {
      const license_key = generateLicenseKey();
      const body = {
        license_key,
        plan,
        status: "unused",
        notes: notes || "",
      };

      const { res: sbRes, text } = await sbFetch("/rest/v1/licenses", {
        method: "POST",
        body,
      });

      if (!(sbRes.status === 201 || sbRes.status === 200)) {
        return res.status(500).json({ error: "Insert failed", detail: text });
      }

      keys.push(license_key);
    }

    return res.status(200).json({ ok: true, keys });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ error: e.message || String(e) });
  }
}

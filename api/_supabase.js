export function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.SUPABASE_URL) throw new Error("Missing SUPABASE_URL env");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env");

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export function supabaseUrl(path) {
  return `${process.env.SUPABASE_URL}${path}`;
}

export async function sbFetch(
  path,
  { method = "GET", query = null, body = null, extraHeaders = null } = {}
) {
  const url = new URL(supabaseUrl(path));
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "")
        url.searchParams.set(k, String(v));
    });
  }

  const headers = {
    ...supabaseHeaders(),
    ...(extraHeaders || {}),
  };

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }

  return { res, text, json };
}

export function requireAdmin(req) {
  const token = req.headers["x-admin-token"];
  if (!process.env.ADMIN_TOKEN) {
    throw new Error("Missing ADMIN_TOKEN env");
  }
  if (!token || token !== process.env.ADMIN_TOKEN) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
}

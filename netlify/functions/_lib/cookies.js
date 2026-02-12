export function parseCookies(header = "") {
  const out = {};
  if (!header) return out;
  const parts = header.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(val);
  }
  return out;
}

export function serializeCookie(name, value, options = {}) {
  const secureDefault = process.env.NETLIFY === "true" || process.env.NODE_ENV === "production";
  const opt = {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: secureDefault,
    ...options
  };
  let str = `${name}=${encodeURIComponent(value)}`;
  if (opt.maxAge != null) str += `; Max-Age=${opt.maxAge}`;
  if (opt.expires) str += `; Expires=${opt.expires.toUTCString()}`;
  if (opt.path) str += `; Path=${opt.path}`;
  if (opt.domain) str += `; Domain=${opt.domain}`;
  if (opt.sameSite) str += `; SameSite=${opt.sameSite}`;
  if (opt.httpOnly) str += `; HttpOnly`;
  if (opt.secure) str += `; Secure`;
  return str;
}

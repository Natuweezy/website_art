import { createServiceClient } from "./supabase.js";

// These are classic (non-Edge) Netlify Functions — Netlify sets this header
// itself at its edge before the request reaches the function, so it can't be
// spoofed by the client. (context.ip only exists for Edge Functions, which
// this codebase doesn't use.) x-forwarded-for is a fallback for local dev
// (e.g. `netlify dev`), where the primary header may be absent.
export function getClientIp(event) {
  const headers = event.headers || {};
  const direct = headers["x-nf-client-connection-ip"] || headers["X-Nf-Client-Connection-Ip"];
  if (direct) return direct.trim();
  const forwarded = headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

// Checks and records one attempt against `key` in a single round trip.
// Returns { allowed: true } if under the limit (and increments the counter),
// or { allowed: false, retryAfterSeconds } if locked out.
// Note: read-then-write, not atomic — acceptable at this app's current
// scale (a race would at worst let a couple of extra attempts through).
export async function checkRateLimit(key, { maxAttempts, windowSeconds, lockSeconds }) {
  const supa = createServiceClient();
  const now = new Date();

  const { data: row } = await supa
    .from("auth_rate_limits")
    .select("attempt_count, first_attempt_at, locked_until")
    .eq("key", key)
    .maybeSingle();

  if (row?.locked_until && new Date(row.locked_until) > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((new Date(row.locked_until) - now) / 1000) };
  }

  const withinWindow = row && (now - new Date(row.first_attempt_at)) / 1000 < windowSeconds;

  if (!row || !withinWindow) {
    await supa.from("auth_rate_limits").upsert({
      key,
      attempt_count: 1,
      first_attempt_at: now.toISOString(),
      locked_until: null
    });
    return { allowed: true };
  }

  const nextCount = row.attempt_count + 1;
  if (nextCount > maxAttempts) {
    const lockedUntil = new Date(now.getTime() + lockSeconds * 1000);
    await supa
      .from("auth_rate_limits")
      .update({ attempt_count: nextCount, locked_until: lockedUntil.toISOString() })
      .eq("key", key);
    return { allowed: false, retryAfterSeconds: lockSeconds };
  }

  await supa.from("auth_rate_limits").update({ attempt_count: nextCount }).eq("key", key);
  return { allowed: true };
}

export async function clearRateLimit(key) {
  const supa = createServiceClient();
  await supa.from("auth_rate_limits").delete().eq("key", key);
}

export function rateLimitMessage(retryAfterSeconds) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

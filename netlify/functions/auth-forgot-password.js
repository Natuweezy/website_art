import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { getClientIp, checkRateLimit, rateLimitMessage } from "./_lib/rateLimit.js";

const SITE_URL = "https://khayarts.com";
const GENERIC_MESSAGE = "If that email address is registered, we've sent a password reset link to it.";
const IP_LIMIT = { maxAttempts: 10, windowSeconds: 60 * 60, lockSeconds: 60 * 60 };

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const email = (payload.email || "").trim();
  if (!email) {
    return jsonResponse(400, { error: "Email is required" });
  }

  const ipLimit = await checkRateLimit(`forgot-password:ip:${getClientIp(event)}`, IP_LIMIT);
  if (!ipLimit.allowed) {
    return jsonResponse(429, { error: rateLimitMessage(ipLimit.retryAfterSeconds) });
  }

  try {
    const supa = createSupabaseClient();
    await supa.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/login_page/reset-password.html`
    });
  } catch {
    // Intentionally swallowed — the response below never reveals whether
    // the email exists or whether delivery succeeded, to avoid account
    // enumeration and to keep the frontend's behavior consistent either way.
  }

  return jsonResponse(200, { ok: true, message: GENERIC_MESSAGE });
}

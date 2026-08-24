import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";

const MIN_PASSWORD_LENGTH = 8;

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

  const accessToken = (payload.access_token || "").trim();
  const refreshToken = (payload.refresh_token || "").trim();
  const password = payload.password || "";

  if (!accessToken || !refreshToken) {
    return jsonResponse(400, { error: "Missing or expired reset link. Request a new one." });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return jsonResponse(400, { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }

  try {
    // access_token + refresh_token come from Supabase's own password-recovery
    // email link, which already proves the requester controls that inbox.
    // updateUser() needs an active session (not just a bearer header), so we
    // establish one via setSession() first, scoped to this one request.
    const authed = createSupabaseClient();
    const { error: sessionError } = await authed.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (sessionError) {
      return jsonResponse(400, { error: "Reset link is invalid or expired. Request a new one." });
    }

    const { error: updateError } = await authed.auth.updateUser({ password });
    if (updateError) {
      return jsonResponse(400, { error: updateError.message || "Unable to reset password. The link may have expired." });
    }
    return jsonResponse(200, { ok: true });
  } catch (err) {
    return jsonResponse(500, { error: err?.message || "Server error" });
  }
}

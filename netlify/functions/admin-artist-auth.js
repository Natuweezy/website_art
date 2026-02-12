import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { requireAdmin } from "./_lib/authz.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const session = await requireAdmin(event);
    const body = JSON.parse(event.body || "{}");
    const email = (body.email || "").trim();
    const password = body.password || "";
    if (!email || !password) {
      return jsonResponse(400, { error: "Email and password are required" }, session.setCookies);
    }

    const supa = createSupabaseClient();
    let userId = null;

    const { data: signUpData, error: signUpErr } = await supa.auth.signUp({ email, password });
    if (signUpErr) {
      const msg = (signUpErr.message || "").toLowerCase();
      const already = msg.includes("already") || msg.includes("registered");
      if (!already) {
        return jsonResponse(400, { error: signUpErr.message }, session.setCookies);
      }
      const { data: signInData, error: signInErr } = await supa.auth.signInWithPassword({ email, password });
      if (signInErr) {
        return jsonResponse(400, { error: signInErr.message }, session.setCookies);
      }
      userId = signInData?.user?.id || null;
    } else {
      userId = signUpData?.user?.id || null;
    }

    if (!userId) {
      return jsonResponse(400, { error: "Unable to resolve user id" }, session.setCookies);
    }

    return jsonResponse(200, { user_id: userId }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

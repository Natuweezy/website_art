import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { requireUser } from "./_lib/authz.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const session = await requireUser(event);
    const supa = createSupabaseClient(session.accessToken);
    const { error } = await supa
      .from("favorites")
      .delete()
      .eq("user_id", session.user.id);

    if (error) return jsonResponse(400, { error: error.message }, session.setCookies);
    return jsonResponse(200, { ok: true }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

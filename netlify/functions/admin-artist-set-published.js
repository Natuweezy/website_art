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
    const artistId = body.id || null;
    const isPublished = body.is_published === true;

    if (!artistId) {
      return jsonResponse(400, { error: "Missing id" }, session.setCookies);
    }

    const supa = createSupabaseClient(session.accessToken);
    const { error } = await supa
      .from("artists")
      .update({ is_published: isPublished })
      .eq("id", artistId);

    if (error) return jsonResponse(400, { error: error.message }, session.setCookies);

    return jsonResponse(200, { ok: true, is_published: isPublished }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

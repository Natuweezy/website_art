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
    const artId = body.art_id || null;
    const artistId = body.artist_id || null;
    if (!artId || !artistId) {
      return jsonResponse(400, { error: "Missing art_id or artist_id" }, session.setCookies);
    }

    const supa = createSupabaseClient(session.accessToken);
    const { error: resetErr } = await supa
      .from("artworks")
      .update({ is_profile: false })
      .eq("artist_id", artistId);

    if (resetErr) return jsonResponse(400, { error: resetErr.message }, session.setCookies);

    const { error: setErr } = await supa
      .from("artworks")
      .update({ is_profile: true })
      .eq("id", artId);

    if (setErr) return jsonResponse(400, { error: setErr.message }, session.setCookies);

    return jsonResponse(200, { ok: true }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

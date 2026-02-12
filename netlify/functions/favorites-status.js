import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { requireUser } from "./_lib/authz.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const session = await requireUser(event);
    const params = new URLSearchParams(event.queryStringParameters || {});
    const artistId = params.get("artist_id") || "";
    if (!artistId) return jsonResponse(400, { error: "Missing artist_id" }, session.setCookies);

    const supa = createSupabaseClient(session.accessToken);
    const { data } = await supa
      .from("favorites")
      .select("artist_id")
      .eq("user_id", session.user.id)
      .eq("artist_id", artistId)
      .maybeSingle();

    return jsonResponse(200, { is_favorite: !!data }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

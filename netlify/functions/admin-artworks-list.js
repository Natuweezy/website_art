import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { requireAdmin } from "./_lib/authz.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const session = await requireAdmin(event);
    const params = new URLSearchParams(event.queryStringParameters || {});
    const artistId = params.get("artist_id") || "";
    if (!artistId) return jsonResponse(400, { error: "Missing artist_id" }, session.setCookies);

    const supa = createSupabaseClient(session.accessToken);
    const { data, error } = await supa
      .from("artworks")
      .select("id,title,year,description,image_url,artist_id,is_profile")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false });

    if (error) return jsonResponse(400, { error: error.message }, session.setCookies);
    return jsonResponse(200, { artworks: data || [] }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

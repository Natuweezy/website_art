import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { getSession } from "./_lib/session.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const artistId = params.get("artist_id") || "";
    const limit = Math.max(0, parseInt(params.get("limit") || "0", 10));
    if (!artistId) return jsonResponse(400, { error: "Missing artist_id" });

    const session = await getSession(event);
    const supa = createSupabaseClient(session.accessToken || null);
    let query = supa
      .from("artworks")
      .select("id,title,description,year,image_url,is_published,created_at,is_profile")
      .eq("artist_id", artistId)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (limit > 0) query = query.limit(limit);

    const { data, error } = await query;
    if (error) return jsonResponse(400, { error: error.message }, session.setCookies);

    return jsonResponse(200, { artworks: data || [] }, session.setCookies);
  } catch (err) {
    return jsonResponse(500, { error: err.message || "Server error" });
  }
}

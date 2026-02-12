import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { getSession } from "./_lib/session.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const slug = params.get("slug") || "";
    if (!slug) return jsonResponse(400, { error: "Missing slug" });

    const session = await getSession(event);
    const supa = createSupabaseClient(session.accessToken || null);

    const { data: artist, error } = await supa
      .from("artists")
      .select("id,user_id,name,slug,bio,country,region_sub,gender,is_published")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) return jsonResponse(400, { error: error.message }, session.setCookies);
    if (!artist) return jsonResponse(404, { error: "Artist not found or unpublished." }, session.setCookies);

    const isOwner = !!(session.user && artist.user_id === session.user.id);

    return jsonResponse(200, { artist, is_owner: isOwner }, session.setCookies);
  } catch (err) {
    return jsonResponse(500, { error: err.message || "Server error" });
  }
}

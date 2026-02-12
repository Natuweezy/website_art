import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { requireUser } from "./_lib/authz.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const session = await requireUser(event);
    const supa = createSupabaseClient(session.accessToken);

    const { data, error } = await supa
      .from("favorites")
      .select("artist_id, created_at, artist:artists(id,name,slug,country,region_sub)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) return jsonResponse(400, { error: error.message }, session.setCookies);

    const list = (data || []).map((row) => ({
      slug: row.artist?.slug || null,
      name: row.artist?.name || null,
      country: row.artist?.country || null,
      region: row.artist?.region_sub || null,
      artist_id: row.artist_id
    }));

    const ids = list.map((l) => l.artist_id).filter(Boolean);
    const profileMap = {};
    if (ids.length) {
      const { data: pics } = await supa
        .from("v_artist_profile_image")
        .select("artist_id, profile_image_url")
        .in("artist_id", ids);
      (pics || []).forEach((p) => {
        if (p.profile_image_url) profileMap[p.artist_id] = p.profile_image_url;
      });
    }

    const enriched = list.map((item) => ({
      ...item,
      image_url: profileMap[item.artist_id] || null
    }));

    return jsonResponse(200, { favorites: enriched }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

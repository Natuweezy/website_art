import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";

// This endpoint is intentionally public — it's used to resolve a
// logged-out visitor's localStorage-based favorites (see
// docs/favorites/favorites.html) back into displayable artist cards, and it
// only ever returns already-published, already-public artist data. The cap
// below just bounds query cost; it's not an access-control measure.
const MAX_IDS = 100;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
    if (!ids.length) return jsonResponse(200, { artists: [] });
    if (ids.length > MAX_IDS) {
      return jsonResponse(400, { error: `Too many ids (max ${MAX_IDS}).` });
    }

    const supa = createSupabaseClient();
    const { data: artists, error } = await supa
      .from("artists")
      .select("id,name,slug,country,region_sub")
      .in("id", ids)
      .eq("is_published", true);

    if (error) return jsonResponse(400, { error: error.message });

    const profileMap = {};
    const { data: pics } = await supa
      .from("v_artist_profile_image")
      .select("artist_id, profile_image_url")
      .in("artist_id", ids);
    (pics || []).forEach((p) => {
      if (p.profile_image_url) profileMap[p.artist_id] = p.profile_image_url;
    });

    const enriched = (artists || []).map((a) => ({
      ...a,
      image_url: profileMap[a.id] || null
    }));

    return jsonResponse(200, { artists: enriched });
  } catch (err) {
    return jsonResponse(500, { error: err.message || "Server error" });
  }
}

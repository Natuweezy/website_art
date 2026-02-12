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
    const q = (params.get("q") || "").trim();
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(params.get("pageSize") || "12", 10)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supa = createSupabaseClient(session.accessToken);
    let query = supa
      .from("artists")
      .select(
        "id,name,slug,bio,country,region_sub,gender,medium,style,theme,mood,color_palette,artist_level,format_size",
        { count: "exact" }
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q) {
      query = query.or(
        `name.ilike.%${q}%,slug.ilike.%${q}%,country.ilike.%${q}%,region_sub.ilike.%${q}%`
      );
    }

    const filters = [
      ["region", "region_sub"],
      ["country", "country"],
      ["gender", "gender"],
      ["medium", "medium"],
      ["style", "style"],
      ["theme", "theme"],
      ["mood", "mood"],
      ["palette", "color_palette"],
      ["level", "artist_level"],
      ["format", "format_size"]
    ];

    for (const [param, column] of filters) {
      const val = params.get(param);
      if (val) query = query.eq(column, val);
    }

    const { data: artists, error, count } = await query;
    if (error) {
      return jsonResponse(400, { error: error.message }, session.setCookies);
    }

    const artistIds = (artists || []).map((a) => a.id);
    let profileMap = {};
    if (artistIds.length) {
      const { data: profiles } = await supa
        .from("v_artist_profile_image")
        .select("artist_id, profile_image_url")
        .in("artist_id", artistIds);
      (profiles || []).forEach((row) => {
        if (row.profile_image_url) profileMap[row.artist_id] = row.profile_image_url;
      });
    }

    const enriched = (artists || []).map((a) => ({
      ...a,
      profile_image_url: profileMap[a.id] || null
    }));

    return jsonResponse(200, { artists: enriched, count: count || 0 }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

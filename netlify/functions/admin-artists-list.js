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
    const term = (params.get("q") || "").trim();
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(params.get("pageSize") || "20", 10)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize;

    const supa = createSupabaseClient(session.accessToken);
    let query = supa
      .from("artists")
      .select(
        "id,name,slug,region_sub,country,bio,gender,medium,style,theme,mood,color_palette,artist_level,format_size,exhibitions,residencies,press,instagram,tiktok,website",
        { count: "exact" }
      )
      .eq("is_published", true);

    if (term) query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);

    query = query.order("name", { ascending: true }).range(from, to);

    const { data, error, count } = await query;
    if (error) return jsonResponse(400, { error: error.message }, session.setCookies);

    const rows = data || [];
    const hasMore = rows.length > pageSize;
    const sliced = hasMore ? rows.slice(0, pageSize) : rows;

    return jsonResponse(200, { artists: sliced, count: count || 0, has_more: hasMore }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

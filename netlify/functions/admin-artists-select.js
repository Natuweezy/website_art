import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { requireAdmin } from "./_lib/authz.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const session = await requireAdmin(event);
    const supa = createSupabaseClient(session.accessToken);
    const { data, error } = await supa
      .from("artists")
      .select("id,name,slug")
      .eq("is_published", true)
      .order("name", { ascending: true });

    if (error) return jsonResponse(400, { error: error.message }, session.setCookies);
    return jsonResponse(200, { artists: data || [] }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

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
    const artistId = body.id || null;
    const payload = body.payload || null;
    if (!payload || !payload.name || !payload.slug) {
      return jsonResponse(400, { error: "Missing artist payload" }, session.setCookies);
    }

    const supa = createSupabaseClient(session.accessToken);
    let result;
    if (artistId) {
      result = await supa.from("artists").update(payload).eq("id", artistId);
    } else {
      result = await supa.from("artists").upsert(payload, { onConflict: "slug" });
    }

    if (result.error) {
      return jsonResponse(400, { error: result.error.message }, session.setCookies);
    }

    return jsonResponse(200, { ok: true }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

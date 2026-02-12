import { createSupabaseClient, createServiceClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { requireAdmin } from "./_lib/authz.js";
import { storageKeyFromPublicUrl } from "./_lib/storage.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const session = await requireAdmin(event);
    const body = JSON.parse(event.body || "{}");
    const artId = body.id || null;
    const imageUrl = body.image_url || null;
    const bucket = process.env.SUPABASE_ARTWORKS_BUCKET || "artworks";

    if (!artId) return jsonResponse(400, { error: "Missing artwork id" }, session.setCookies);

    const supa = createSupabaseClient(session.accessToken);
    const { error } = await supa.from("artworks").delete().eq("id", artId);
    if (error) return jsonResponse(400, { error: error.message }, session.setCookies);

    if (imageUrl) {
      const key = storageKeyFromPublicUrl(imageUrl, bucket);
      if (key) {
        const service = createServiceClient();
        await service.storage.from(bucket).remove([key]);
      }
    }

    return jsonResponse(200, { ok: true }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

import { createSupabaseClient, createServiceClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { requireAdmin } from "./_lib/authz.js";
import { storageKeyFromPublicUrl } from "./_lib/storage.js";

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const session = await requireAdmin(event);
    const body = JSON.parse(event.body || "{}");
    const artId = body.id || null;
    const artistId = body.artist_id || null;
    const title = (body.title || "").trim();
    const year = body.year || null;
    const description = body.description || null;
    const image = body.image || null;
    const bucket = process.env.SUPABASE_ARTWORKS_BUCKET || "artworks";

    if (!artistId || !title) {
      return jsonResponse(400, { error: "artist_id and title are required" }, session.setCookies);
    }

    const supa = createSupabaseClient(session.accessToken);
    const service = createServiceClient();

    let imageUrl = null;
    let existingImageUrl = null;

    if (artId) {
      const { data: existing } = await supa
        .from("artworks")
        .select("image_url")
        .eq("id", artId)
        .maybeSingle();
      existingImageUrl = existing?.image_url || null;
    }

    if (image && image.data && image.content_type) {
      const key = `images/${artistId}/${Date.now()}-${slugify(title)}`;
      const buffer = Buffer.from(image.data, "base64");
      const { error: uploadErr } = await service.storage
        .from(bucket)
        .upload(key, buffer, { contentType: image.content_type, upsert: true });
      if (uploadErr) {
        return jsonResponse(400, { error: uploadErr.message }, session.setCookies);
      }
      imageUrl = service.storage.from(bucket).getPublicUrl(key).data.publicUrl;
    }

    if (artId) {
      const updatePayload = {
        title,
        year,
        description,
        is_published: true
      };
      if (imageUrl) updatePayload.image_url = imageUrl;
      const { error } = await supa.from("artworks").update(updatePayload).eq("id", artId);
      if (error) return jsonResponse(400, { error: error.message }, session.setCookies);

      if (imageUrl && existingImageUrl) {
        const oldKey = storageKeyFromPublicUrl(existingImageUrl, bucket);
        if (oldKey) {
          await service.storage.from(bucket).remove([oldKey]);
        }
      }
      return jsonResponse(200, { ok: true, image_url: imageUrl || existingImageUrl }, session.setCookies);
    }

    const { error } = await supa
      .from("artworks")
      .insert([
        {
          artist_id: artistId,
          title,
          year,
          description,
          image_url: imageUrl,
          is_published: true,
          is_profile: false
        }
      ]);

    if (error) return jsonResponse(400, { error: error.message }, session.setCookies);
    return jsonResponse(200, { ok: true, image_url: imageUrl }, session.setCookies);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Server error" }, err.setCookies || []);
  }
}

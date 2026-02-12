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

    const session = await getSession(event);
    const supa = createSupabaseClient(session.accessToken || null);

    let isSelf = false;
    let selfSlug = null;
    let redirect = null;

    if (session.user) {
      const { data: selfArtist } = await supa
        .from("artists")
        .select("id,slug")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (selfArtist?.slug) {
        isSelf = true;
        selfSlug = selfArtist.slug;
        if (slug && slug !== selfArtist.slug) {
          redirect = `./biopage.html?slug=${encodeURIComponent(selfArtist.slug)}`;
        }
      }
    }

    if (!isSelf && !slug) {
      return jsonResponse(400, { error: "Missing artist slug." }, session.setCookies);
    }

    let query = supa
      .from("artists")
      .select(
        "id,name,slug,bio,country,region_sub,gender,is_published,exhibitions,residencies,press,instagram,tiktok,website"
      );
    if (isSelf && session.user) {
      query = query.eq("user_id", session.user.id);
    } else {
      query = query.eq("slug", slug).eq("is_published", true);
    }

    const { data: artist, error } = await query.maybeSingle();
    if (error) {
      return jsonResponse(400, { error: error.message }, session.setCookies);
    }
    if (!artist) {
      return jsonResponse(404, { error: "Artist not found or unpublished." }, session.setCookies);
    }

    return jsonResponse(
      200,
      {
        artist,
        is_self: isSelf,
        self_slug: selfSlug,
        redirect
      },
      session.setCookies
    );
  } catch (err) {
    return jsonResponse(500, { error: err.message || "Server error" });
  }
}

import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { getSession } from "./_lib/session.js";

export async function handler(event) {
  try {
    const { user, accessToken, setCookies } = await getSession(event);
    if (!user) {
      return jsonResponse(200, { user: null, artist_slug: null, is_admin: false }, setCookies);
    }

    const authed = createSupabaseClient(accessToken);
    const [{ data: artistRow }, { data: adminRow }] = await Promise.all([
      authed.from("artists").select("slug").eq("user_id", user.id).maybeSingle(),
      authed.from("admins").select("user_id").eq("user_id", user.id).maybeSingle()
    ]);

    return jsonResponse(
      200,
      {
        user: { id: user.id, email: user.email || null },
        artist_slug: artistRow?.slug || null,
        is_admin: !!adminRow
      },
      setCookies
    );
  } catch (err) {
    return jsonResponse(500, { error: err?.message || "Server error" });
  }
}

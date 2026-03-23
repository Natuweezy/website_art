import { createSupabaseClient } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/response.js";
import { loginCookies } from "./_lib/session.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      ...jsonResponse(405, {
        error: `Method not allowed for auth-login. Received ${event.httpMethod || "unknown"}, expected POST.`
      }),
      headers: {
        "Content-Type": "application/json",
        Allow: "POST"
      }
    };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const email = (payload.email || "").trim();
  const password = payload.password || "";
  if (!email || !password) {
    return jsonResponse(400, { error: "Email and password are required" });
  }

  try {
    const supa = createSupabaseClient();
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      return jsonResponse(401, { error: error?.message || "Invalid credentials" });
    }

    const session = data.session;
    const authed = createSupabaseClient(session.access_token);

    const [{ data: artistRow }, { data: adminRow }] = await Promise.all([
      authed.from("artists").select("slug").eq("user_id", data.user.id).maybeSingle(),
      authed.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle()
    ]);

    return jsonResponse(
      200,
      {
        user: { id: data.user.id, email: data.user.email || null },
        artist_slug: artistRow?.slug || null,
        is_admin: !!adminRow
      },
      loginCookies(session)
    );
  } catch (err) {
    return jsonResponse(500, { error: err?.message || "Server error" });
  }
}

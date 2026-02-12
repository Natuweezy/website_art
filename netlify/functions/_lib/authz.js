import { getSession } from "./session.js";
import { createSupabaseClient } from "./supabase.js";

export async function requireUser(event) {
  const session = await getSession(event);
  if (!session.user) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    err.setCookies = session.setCookies;
    throw err;
  }
  return session;
}

export async function requireAdmin(event) {
  const session = await requireUser(event);
  const authed = createSupabaseClient(session.accessToken);
  const { data } = await authed
    .from("admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!data) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    err.setCookies = session.setCookies;
    throw err;
  }
  return session;
}

import { createClient } from "@supabase/supabase-js";

export function getEnv() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
  if (!url || !anonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.");
  }
  return { url, anonKey, serviceRoleKey };
}

export function createSupabaseClient(accessToken = null) {
  const { url, anonKey } = getEnv();
  const headers = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: { headers }
  });
}

export function createServiceClient() {
  const { url, serviceRoleKey } = getEnv();
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env var.");
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

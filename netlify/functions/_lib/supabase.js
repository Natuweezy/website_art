import { createClient } from "@supabase/supabase-js";

function firstDefined(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return null;
}

export function getEnv() {
  const url = firstDefined(
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "PUBLIC_SUPABASE_URL"
  );
  const anonKey = firstDefined(
    "SUPABASE_ANON_KEY",
    "SUPABASE_ANON",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "PUBLIC_SUPABASE_ANON_KEY"
  );
  const serviceRoleKey = firstDefined(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
    "VITE_SUPABASE_SERVICE_ROLE_KEY",
    "PUBLIC_SUPABASE_SERVICE_ROLE_KEY"
  );
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_ANON_KEY (or NEXT_PUBLIC_/VITE_/PUBLIC_ aliases)."
    );
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

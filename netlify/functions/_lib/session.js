import { parseCookies, serializeCookie } from "./cookies.js";
import { createSupabaseClient } from "./supabase.js";

const ACCESS_COOKIE = "sb_access";
const REFRESH_COOKIE = "sb_refresh";
const MAX_AGE = 60 * 60 * 24 * 30;

function clearCookie(name) {
  return serializeCookie(name, "", {
    maxAge: 0,
    expires: new Date(0)
  });
}

function setCookie(name, value) {
  return serializeCookie(name, value, { maxAge: MAX_AGE });
}

export async function getSession(event) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || "";
  const cookies = parseCookies(cookieHeader);
  const access = cookies[ACCESS_COOKIE] || null;
  const refresh = cookies[REFRESH_COOKIE] || null;
  if (!access || !refresh) {
    return { user: null, accessToken: null, refreshToken: null, setCookies: [] };
  }

  const supa = createSupabaseClient();
  const { data: userData, error: userErr } = await supa.auth.getUser(access);
  if (!userErr && userData?.user) {
    return { user: userData.user, accessToken: access, refreshToken: refresh, setCookies: [] };
  }

  const { data: refreshData, error: refreshErr } = await supa.auth.refreshSession({ refresh_token: refresh });
  if (refreshErr || !refreshData?.session) {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      setCookies: [clearCookie(ACCESS_COOKIE), clearCookie(REFRESH_COOKIE)]
    };
  }

  const nextAccess = refreshData.session.access_token;
  const nextRefresh = refreshData.session.refresh_token;
  const { data: nextUserData } = await supa.auth.getUser(nextAccess);
  return {
    user: nextUserData?.user || null,
    accessToken: nextAccess,
    refreshToken: nextRefresh,
    setCookies: [setCookie(ACCESS_COOKIE, nextAccess), setCookie(REFRESH_COOKIE, nextRefresh)]
  };
}

export function loginCookies(session) {
  if (!session?.access_token || !session?.refresh_token) return [];
  return [
    setCookie(ACCESS_COOKIE, session.access_token),
    setCookie(REFRESH_COOKIE, session.refresh_token)
  ];
}

export function clearSessionCookies() {
  return [clearCookie(ACCESS_COOKIE), clearCookie(REFRESH_COOKIE)];
}

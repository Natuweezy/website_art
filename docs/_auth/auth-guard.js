// /_auth/auth-guard.js
const API_BASE = "/.netlify/functions";

export async function getSession() {
  const res = await fetch(`${API_BASE}/auth-session`);
  const data = await res.json().catch(() => ({}));
  return data || null;
}

// Require any signed-in user
export async function requireAuth({ redirect = "../login_page/login.html" } = {}) {
  const data = await getSession();
  if (!data?.user) {
    location.href = redirect;
    return null;
  }
  return data;
}

// Require admin by checking membership in public.admins
export async function requireAdmin({
  redirectIfNoSession = "../admin/admin.html",
  redirectIfNotAdmin = "../search_page/search_bar.html",
} = {}) {
  const data = await requireAuth({ redirect: redirectIfNoSession });
  if (!data) return null;
  if (!data.is_admin) {
    location.href = redirectIfNotAdmin;
    return null;
  }
  return data;
}

// (Optional) quick helper without redirecting
export async function isAdmin() {
  const data = await getSession();
  return !!data?.is_admin;
}

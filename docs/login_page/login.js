// /public/login_page/login.js
const API_BASE = "/.netlify/functions";
const LOGIN_TIMEOUT_MS = 12000;

const loginForm = document.getElementById("loginForm");
const errEl = document.getElementById("login-error");
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");

function showError(msg) {
  if (errEl) errEl.textContent = msg || "";
}

function requireFields() {
  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";
  if (!email || !password) {
    showError("Enter both email and password.");
    return null;
  }
  return { email, password };
}

// Fail fast if network hangs
function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Login timed out. Check your connection.")), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const creds = requireFields();
  if (!creds) return;

  const { email, password } = creds;
  showError("");
  loginBtn?.setAttribute("disabled", "true");

  try {
    const res = await withTimeout(
      fetch(`${API_BASE}/auth-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      }),
      LOGIN_TIMEOUT_MS
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Login failed.");

    // Success → redirect (artists go to their own bio)
    if (data.artist_slug) {
      window.location.href = `../biopage/biopage.html?slug=${encodeURIComponent(data.artist_slug)}`;
    } else {
      window.location.href = "../search_page/search_bar.html";
    }
  } catch (err) {
    console.error("Login error:", err);
    showError(friendly(err));
  } finally {
    loginBtn?.removeAttribute("disabled");
  }
});

// Map Supabase errors to user-friendly messages
function friendly(err) {
  const msg = (err?.message || "").toLowerCase();
  const status = err?.status;

  if (status === 429 || msg.includes("rate limit")) {
    return "Too many attempts. Please wait and try again.";
  }
  if (msg.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (msg.includes("email not confirmed") || msg.includes("email not verified")) {
    return "Please confirm your email before signing in.";
  }
  if (msg.includes("invalid email")) {
    return "Enter a valid email address.";
  }
  if (msg.includes("network")) {
    return "Network error. Check your connection.";
  }
  return err?.message || "Something went wrong.";
}

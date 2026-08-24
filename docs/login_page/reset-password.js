// /public/login_page/reset-password.js
const API_BASE = "/.netlify/functions";
const REQUEST_TIMEOUT_MS = 12000;

const form = document.getElementById("resetForm");
const passwordInput = document.getElementById("resetPassword");
const confirmInput = document.getElementById("resetPasswordConfirm");
const statusEl = document.getElementById("reset-status");
const submitBtn = document.getElementById("resetBtn");
const backLink = document.getElementById("reset-back-link");

function setStatus(message, state = "") {
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.dataset.state = state;
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Request timed out. Check your connection.")), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

// Supabase's recovery-link redirect appends the tokens as a URL fragment,
// e.g. #access_token=...&refresh_token=...&type=recovery
function readRecoveryTokens() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get("access_token") || "",
    refreshToken: params.get("refresh_token") || "",
    type: params.get("type") || ""
  };
}

const { accessToken, refreshToken, type } = readRecoveryTokens();

// Strip the tokens from the visible URL/history right away so they don't
// linger in browser history or get leaked via a referrer header.
if (window.location.hash) {
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

if (!accessToken || !refreshToken || type !== "recovery") {
  setStatus("This reset link is invalid or has expired. Request a new one.", "error");
  backLink?.removeAttribute("hidden");
  backLink.textContent = "Request a new link";
  backLink.href = "./forgot-password.html";
} else {
  form?.removeAttribute("hidden");
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = passwordInput?.value || "";
  const confirm = confirmInput?.value || "";

  if (password.length < 8) {
    setStatus("Password must be at least 8 characters.", "error");
    return;
  }
  if (password !== confirm) {
    setStatus("Passwords don't match.", "error");
    return;
  }

  setStatus("");
  submitBtn?.setAttribute("disabled", "true");

  try {
    const res = await withTimeout(
      fetch(`${API_BASE}/auth-reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, password })
      }),
      REQUEST_TIMEOUT_MS
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Unable to reset password.");
    }

    form.setAttribute("hidden", "");
    setStatus("Password updated. You can now log in.", "success");
    backLink?.removeAttribute("hidden");
    backLink.textContent = "Go to login";
    backLink.href = "./login.html";
  } catch (err) {
    setStatus(err.message || "Unable to reset password.", "error");
  } finally {
    submitBtn?.removeAttribute("disabled");
  }
});

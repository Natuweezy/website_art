// /public/login_page/forgot-password.js
const API_BASE = "/.netlify/functions";
const REQUEST_TIMEOUT_MS = 12000;

const form = document.getElementById("forgotForm");
const emailInput = document.getElementById("forgotEmail");
const statusEl = document.getElementById("forgot-status");
const submitBtn = document.getElementById("forgotBtn");

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

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput?.value.trim() || "";
  if (!email) {
    setStatus("Enter your email address.", "error");
    return;
  }

  setStatus("");
  submitBtn?.setAttribute("disabled", "true");

  try {
    const res = await withTimeout(
      fetch(`${API_BASE}/auth-forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      }),
      REQUEST_TIMEOUT_MS
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Something went wrong.");
    }
    form.reset();
    setStatus(data.message || "If that address is registered, check your inbox for a reset link.", "success");
  } catch (err) {
    setStatus(err.message || "Something went wrong.", "error");
  } finally {
    submitBtn?.removeAttribute("disabled");
  }
});

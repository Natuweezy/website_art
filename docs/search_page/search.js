// /public/search_page/search.js — static cards + profile artwork via view

// === Config ===
const pageSize = 12;
const API_BASE = "/.netlify/functions";

let sessionInfo = null;

// Auth guard (matches your RLS = authenticated only)
async function ensureSignedIn() {
  try {
    const res = await fetch(`${API_BASE}/auth-session`);
    const data = await res.json();
    sessionInfo = data;
    if (!data?.user) {
      location.href = "../login_page/login.html";
      return false;
    }
    const label = data.user.email || data.user.id;
    const menuUser = document.getElementById("menuUser");
    if (menuUser) menuUser.textContent = label;
    return true;
  } catch {
    location.href = "../login_page/login.html";
    return false;
  }
}

// DOM references
const listEl   = document.querySelector(".results-grid");
const inputEl  = document.getElementById("searchInput");
const pageSpan = document.querySelector(".pagination span");
const prevBtn  = document.querySelector(".pagination button:nth-child(1)");
const nextBtn  = document.querySelector(".pagination button:nth-child(3)");
const regionSel   = document.getElementById("filterRegion");
const genderSel   = document.getElementById("filterGender");
const liveRegion  = document.getElementById("resultsStatus");
const menuBtn = document.getElementById("profileMenuBtn");
const menu = document.getElementById("profileMenu");
const logoutBtn = document.getElementById("logoutBtn");

// NEW FILTER DOM REFS
const mediumSel   = document.getElementById("filterMedium");    // Medium / Art Form
const styleSel    = document.getElementById("filterStyle");     // Style / Aesthetic
const themeSel    = document.getElementById("filterTheme");     // Themes / Content
const paletteSel  = document.getElementById("filterPalette");   // Color Palette
const filtersPanel = document.getElementById("filtersPanel");
const filtersToggle = document.getElementById("toggleFilters");

// Profile menu handlers
if (menuBtn && menu) {
  menuBtn.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
      menu.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });
}

logoutBtn?.addEventListener("click", async () => {
  await fetch(`${API_BASE}/auth-logout`, { method: "POST" });
  location.href = "../login_page/login.html";
});

function disableLogoLink(linkEl) {
  if (!linkEl) return;
  linkEl.removeAttribute("href");
  linkEl.setAttribute("aria-disabled", "true");
  linkEl.setAttribute("tabindex", "-1");
  linkEl.classList.add("is-disabled");
  linkEl.addEventListener("click", (e) => e.preventDefault());
}

async function maybeDisableLogoForArtist() {
  const linkEl = document.querySelector("[data-logo-link]");
  if (!linkEl) return;
  if (sessionInfo?.artist_slug) disableLogoLink(linkEl);
}

let page = 1;
let lastQuery = "";

const REGION_COUNTRIES = {
  "North Africa": ["Algeria","Egypt","Libya","Morocco","Sudan","Tunisia"],
  "West Africa": ["Benin","Burkina Faso","Cabo Verde","Côte d’Ivoire","Gambia","Ghana","Guinea","Guinea-Bissau","Liberia","Mali","Mauritania","Niger","Nigeria","Senegal","Sierra Leone","Togo"],
  "East Africa": ["Burundi","Comoros","Djibouti","Eritrea","Ethiopia","Kenya","Madagascar","Malawi","Mauritius","Mozambique","Rwanda","Seychelles","Somalia","South Sudan","Tanzania","Uganda"],
  "Central Africa": ["Angola","Cameroon","Central African Republic","Chad","Congo","Democratic Republic of the Congo","Equatorial Guinea","Gabon","São Tomé and Príncipe"],
  "Southern Africa": ["Botswana","Eswatini","Lesotho","Namibia","South Africa","Zambia","Zimbabwe"],
  "North America": ["Canada","United States","Mexico","Greenland"],
  "Central America": ["Belize","Costa Rica","El Salvador","Guatemala","Honduras","Nicaragua","Panama"],
  "Caribbean": ["Antigua and Barbuda","Bahamas","Barbados","Cuba","Dominica","Dominican Republic","Grenada","Haiti","Jamaica","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Trinidad and Tobago"],
  "South America": ["Argentina","Bolivia","Brazil","Chile","Colombia","Ecuador","Guyana","Paraguay","Peru","Suriname","Uruguay","Venezuela"]
};

const PLACEHOLDER = "../sample_images/sample_img.png";

// Static artist card (no favorites icon)
function artistCard(artist, imageUrl) {
  const card = document.createElement("div");
  card.className = "artist-card";

  const safeLocation = [artist.country, artist.region_sub].filter(Boolean).join(" — ");

  const link = document.createElement("a");
  link.href = `../artist_page/artist_page.html?slug=${encodeURIComponent(artist.slug)}`;
  link.className = "card-link";
  link.innerHTML = `
      <div class="art-image">
        <img alt="${artist.name}" loading="lazy" />
      </div>
      <div class="artist-info">
        <h3>${artist.name}</h3>
        ${safeLocation ? `<p>${safeLocation}</p>` : ""}
      </div>
    `;

  const imgEl = link.querySelector(".art-image img");
  imgEl.src = imageUrl || PLACEHOLDER;

  card.appendChild(link);
  return card;
}

async function runSearch(q, pageNum = 1) {
  lastQuery = q;
  listEl.innerHTML = "";

  try {
    const params = new URLSearchParams({
      q: q || "",
      page: String(pageNum),
      pageSize: String(pageSize)
    });
    if (regionSel?.value)   params.set("region", regionSel.value);
    if (genderSel?.value)   params.set("gender", genderSel.value);
    if (mediumSel?.value)   params.set("medium", mediumSel.value);
    if (styleSel?.value)    params.set("style", styleSel.value);
    if (themeSel?.value)    params.set("theme", themeSel.value);
    if (paletteSel?.value)  params.set("palette", paletteSel.value);

    const res = await fetch(`${API_BASE}/search-artists?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        location.href = "../login_page/login.html";
        return;
      }
      listEl.innerHTML =
        `<div class="artist-card" style="padding:15px;">Search error: ${data.error || "Unknown error"}</div>`;
      return;
    }

    const artists = data.artists || [];

    // Render cards
    listEl.innerHTML = "";
    (artists || []).forEach(a => {
      const img = a.profile_image_url || null;
      const card = artistCard(a, img);
      listEl.appendChild(card);
    });

    const totalPages = Math.max(1, Math.ceil((data.count || 0) / pageSize));
    page = Math.min(pageNum, totalPages);
    pageSpan.textContent = `${page} of ${totalPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;

    // Update live-region for accessibility
    if (liveRegion) {
      const total = data.count || 0;
      liveRegion.textContent =
        `Showing ${artists?.length || 0} artists. Page ${page} of ${totalPages}. Total results: ${total}.`;
    }
  } catch (err) {
    console.error(err);
    listEl.innerHTML =
      `<div class="artist-card" style="padding:15px;">Error: ${err.message || err}</div>`;
  }
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

inputEl.addEventListener(
  "input",
  debounce(() => runSearch(inputEl.value, 1), 250)
);
regionSel?.addEventListener("change", () => {
  runSearch(inputEl.value, 1);
});
genderSel?.addEventListener("change", () => runSearch(inputEl.value, 1));

// NEW FILTER LISTENERS
mediumSel?.addEventListener("change", () => runSearch(inputEl.value, 1));
styleSel?.addEventListener("change", () => runSearch(inputEl.value, 1));
themeSel?.addEventListener("change", () => runSearch(inputEl.value, 1));
paletteSel?.addEventListener("change", () => runSearch(inputEl.value, 1));

prevBtn.addEventListener("click", () =>
  runSearch(lastQuery, Math.max(1, page - 1))
);
nextBtn.addEventListener("click", () =>
  runSearch(lastQuery, page + 1)
);

filtersToggle?.addEventListener("click", () => {
  const nowOpen = !(filtersPanel?.classList.toggle("hidden"));
  filtersToggle.setAttribute("aria-expanded", nowOpen ? "true" : "false");
});

(async function init() {
  const ok = await ensureSignedIn();
  if (!ok) return;
  await maybeDisableLogoForArtist();
  runSearch("", 1);
})();

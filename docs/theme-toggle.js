(function () {
  if (typeof window === "undefined") return;

  const KEY = "khaya_theme";
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  const stored = localStorage.getItem(KEY);
  const initial = stored || (prefersLight ? "light" : "dark");
  const btns = Array.from(document.querySelectorAll("[data-theme-toggle]"));

  const apply = (theme) => {
    const next = theme === "light" ? "light" : "dark";
    document.body.dataset.theme = next;
    btns.forEach((btn) => {
      btn.textContent = next === "light" ? "☾" : "☀";
      const label = next === "light" ? "Switch to dark mode" : "Switch to light mode";
      btn.setAttribute("aria-label", label);
      btn.title = label;
      btn.setAttribute("aria-pressed", next === "light" ? "true" : "false");
    });
  };

  apply(initial);

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = document.body.dataset.theme === "light" ? "dark" : "light";
      localStorage.setItem(KEY, next);
      apply(next);
    });
  });
})();

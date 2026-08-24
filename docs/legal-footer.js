// /legal-footer.js
// Ensures every page links to the Impressum and Privacy Policy (§ 5 DDG reachability
// requirement: these must be reachable within two clicks from every page).
// If a page already has its own footer with an Impressum link (e.g. the homepage),
// this only tops up a missing Privacy Policy link instead of injecting a duplicate bar.
(function () {
  if (typeof document === "undefined") return;

  var path = (location.pathname || "").toLowerCase();
  if (path.endsWith("/impressum.html") || path.endsWith("/datenschutz.html")) return;

  function styleLink(a) {
    a.style.cssText = "color:inherit;text-decoration:none;border-bottom:1px solid transparent;";
    a.addEventListener("mouseenter", function () { a.style.color = "#f2c34a"; });
    a.addEventListener("mouseleave", function () { a.style.color = ""; });
  }

  var existingImpressum = document.querySelector('a[href$="impressum.html"]');

  if (existingImpressum) {
    if (!document.querySelector('a[href$="datenschutz.html"]')) {
      var link = document.createElement("a");
      link.href = "/datenschutz.html";
      link.textContent = "Privacy Policy";
      if (existingImpressum.className) link.className = existingImpressum.className;
      existingImpressum.insertAdjacentElement("afterend", link);
    }
    return;
  }

  var bar = document.createElement("footer");
  bar.setAttribute("data-legal-footer", "");
  bar.style.cssText = [
    "margin-top:32px",
    "padding:14px 16px",
    "border-top:1px solid rgba(128,128,128,0.25)",
    "display:flex",
    "flex-wrap:wrap",
    "gap:8px 18px",
    "justify-content:center",
    "font:500 0.78rem/1.4 Inter,system-ui,-apple-system,sans-serif",
    "color:inherit",
    "opacity:0.65"
  ].join(";");

  [
    ["/impressum.html", "Impressum"],
    ["/datenschutz.html", "Privacy Policy"]
  ].forEach(function (pair) {
    var a = document.createElement("a");
    a.href = pair[0];
    a.textContent = pair[1];
    styleLink(a);
    bar.appendChild(a);
  });

  document.body.appendChild(bar);
})();

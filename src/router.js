// A tiny page switcher: gives the app real addresses (/login, /dashboard)
// without needing an extra library.
export function navigate(to, { replace = false } = {}) {
  if (window.location.pathname === to) return;
  window.history[replace ? "replaceState" : "pushState"](null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate")); // tells App to re-read the address
}

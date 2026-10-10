// Tiny router: maps the URL path to a start target, so each mode has its own address.
//   /            main menu (Уровень / Мастерская / Полигон, mouse or keyboard)
//   /table       level "Ящик стола"
//   /workshop    workshop (lights, purchases, mods)
//   /range       test range (Полигон)
//   /basement    level 2 "Подвал"
// Old query flags (?range, ?play) still work for quick checks.
export const ROUTES = {
  '/': 'menu',
  '/table': 'table',
  '/workshop': 'workshop',
  '/range': 'range',
  '/basement': 'basement',
};

/** Resolves the current URL to a target name. Unknown paths go to the menu. */
export function resolveRoute(loc = window.location) {
  const path = stripBase(loc.pathname).replace(/\/+$/, '') || '/';
  if (ROUTES[path]) return ROUTES[path];
  // legacy query flags
  if (loc.search.includes('range')) return 'range';
  if (loc.search.includes('play')) return 'table';
  return 'menu';
}

/** Changes the address without reloading, so back/forward and reload keep the mode. */
export function navigate(target) {
  const route = Object.keys(ROUTES).find((k) => ROUTES[k] === target) || '/';
  const url = withBase(route);
  if (window.location.pathname !== url) window.history.pushState({}, '', url);
}

/** The site root as Vite knows it: '/' locally, '/lighters-game/' on GitHub Pages. No trailing slash. */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Route path → real address on this host (keeps the Pages sub-path). */
export function withBase(route) {
  return route === '/' ? (BASE + '/') : BASE + route;
}

/** Real address → route path (drops the base, so '/lighters-game/basement' is '/basement'). */
export function stripBase(pathname) {
  if (BASE && pathname.startsWith(BASE)) return pathname.slice(BASE.length) || '/';
  return pathname;
}

// Tiny router: maps the URL path to a start target, so each mode has its own address.
//   /            main menu (Уровень / Мастерская / Полигон, mouse or keyboard)
//   /level       level "Ящик стола"
//   /workshop    workshop (lights, purchases, mods)
//   /range       test range (Полигон)
//   /basement    level 2 "Подвал"
// Old query flags (?range, ?play) still work for quick checks.
export const ROUTES = {
  '/': 'menu',
  '/level': 'level',
  '/workshop': 'workshop',
  '/range': 'range',
  '/basement': 'basement',
};

/** Resolves the current URL to a target name. Unknown paths go to the menu. */
export function resolveRoute(loc = window.location) {
  const path = loc.pathname.replace(/\/+$/, '') || '/';
  if (ROUTES[path]) return ROUTES[path];
  // legacy query flags
  if (loc.search.includes('range')) return 'range';
  if (loc.search.includes('play')) return 'level';
  return 'menu';
}

/** Changes the address without reloading, so back/forward and reload keep the mode. */
export function navigate(target) {
  const path = Object.keys(ROUTES).find((k) => ROUTES[k] === target) || '/';
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
}

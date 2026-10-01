const competitionTypes = new Set(['draft_premiership', 'fantasy_cup']);
export function resolveRoute(hash) {
  const path = hash.replace(/^#\/?/, '').split('/');
  if (path.length === 1 && (!path[0] || path[0] === 'dashboard')) return { view: 'dashboard' };
  if (path.length >= 3 && path.length <= 4 && path[0] === 'competition' && /^\d{4}$/.test(path[1])) {
    const year = Number(path[1]);
    if (year >= 2020 && year <= 2100 && competitionTypes.has(path[2]) && (!path[3] || path[3] === 'awards')) {
      return { view: path[3] || 'competition', year, competitionType: path[2] };
    }
  }
  return { view: 'missing' };
}
export async function renderRoute(target, hash) {
  const route = resolveRoute(hash);
  if (route.view === 'competition' || route.view === 'awards') {
    const module = route.view === 'awards' ? await import('./views/awards.js') : await import('./views/competition.js');
    // A slow import must not replace a newer selection.
    if (hash === window.location.hash) module.render(target, route);
  } else {
    target.textContent = route.view === 'dashboard'
      ? 'League features are being built and are not available yet.'
      : 'This competition page could not be found.';
  }
}

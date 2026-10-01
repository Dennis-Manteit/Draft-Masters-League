import { apiClient } from '../api_client.js';
const views = new Set(['ladder', 'player-awards', 'coach-awards']);
const columns = {
  ladder: [['#', 'rank'], ['TEAM', 'name'], ['PTS', 'pts'], ['PF', 'pointsFor']],
  'player-awards': [['#', 'rank'], ['PLAYER', 'playerName'], ['POTM', 'playerOfTheMatch'], ['POTR', 'playerOfTheRound'], ['TOTW', 'teamOfTheWeek'], ['PTS', 'totalPoints']],
  'coach-awards': [['#', 'rank'], ['COACH / FRANCHISE', 'coachName'], ['POTM', 'playOfTheMatch'], ['POTW', 'performanceOfTheWeek'], ['COTR', 'coachOfTheRound'], ['PTS', 'totalPoints']],
};
export function createStandingsLoader({ request = apiClient.get, getToken, uid, now = Date.now }) {
  let context;
  let generation = 0;
  const cache = new Map();
  const pending = new Map();
  const keyFor = view => JSON.stringify([uid, context.leagueId, context.season, context.competitionType, view]);
  function clear() {
    generation++;
    for (const entry of pending.values()) entry.controller.abort();
    pending.clear(); cache.clear(); context = null;
  }
  function cacheRows(key, rows) {
    if (cache.size >= 12) cache.delete(cache.keys().next().value);
    cache.set(key, { rows, expires: now() + (context.season <= 2023 ? 600_000 : 30_000) });
  }
  return {
    clear,
    setContext(next, ladder) {
      clear(); context = { ...next };
      if (context.leagueId && Array.isArray(ladder)) cacheRows(keyFor('ladder'), ladder);
    },
    async load(view) {
      if (!views.has(view)) throw new Error('Invalid standings view');
      if (!context?.leagueId || !/^[A-Za-z0-9_-]{1,80}$/.test(context.leagueId)) throw new Error('No assigned league');
      const key = keyFor(view);
      const cached = cache.get(key);
      if (cached && cached.expires > now()) return cached.rows;
      if (pending.has(key)) return pending.get(key).promise;
      const current = generation;
      const scope = { ...context };
      const controller = new AbortController();
      const entry = { controller };
      entry.promise = (async () => {
        const token = await getToken();
        if (current !== generation) throw new Error('Selection changed');
        const data = await request(`/api/v1/competition/${scope.season}/${scope.competitionType}/standings/${view}?leagueId=${encodeURIComponent(scope.leagueId)}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (current !== generation) throw new Error('Selection changed');
        if (!data || !Array.isArray(data.rows) || data.rows.length > 1000 || data.view !== view || ['leagueId', 'season', 'competitionType'].some(field => data[field] !== scope[field])) throw new Error('Standings do not match this competition');
        cacheRows(key, data.rows);
        return data.rows;
      })().finally(() => { if (pending.get(key) === entry) pending.delete(key); });
      pending.set(key, entry);
      return entry.promise;
    },
  };
}
export function renderStandingsTable(container, view, rows) {
  const table = document.createElement('table'); table.className = 'compact-table';
  const caption = document.createElement('caption'); caption.className = 'sr-only';
  caption.textContent = { ladder: 'Team ladder', 'player-awards': 'Player awards leaderboard', 'coach-awards': 'Dennis Manteit Medal coach standings' }[view];
  const head = document.createElement('thead'); const headings = document.createElement('tr');
  for (const [label] of columns[view]) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; headings.append(th); }
  head.append(headings);
  const body = document.createElement('tbody');
  if (!rows.length) { const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = columns[view].length; td.textContent = 'No standings have been saved for this view yet.'; tr.append(td); body.append(tr); }
  rows.forEach((entry, index) => {
    const tr = document.createElement('tr');
    for (const [, field] of columns[view]) {
      const td = document.createElement('td'); td.textContent = String(entry[field] ?? (field === 'rank' ? index + 1 : '—'));
      if (field === 'coachName' && entry.franchiseName) { const franchise = document.createElement('span'); franchise.className = 'sub-label'; franchise.textContent = String(entry.franchiseName); td.append(franchise); }
      tr.append(td);
    }
    body.append(tr);
  });
  table.append(caption, head, body); container.replaceChildren(table);
}
export function mountStandings(user) {
  const container = document.getElementById('standings-content-container');
  const buttons = [...document.querySelectorAll('.standings-toggle-bar button')];
  const loader = createStandingsLoader({ uid: user.uid, getToken: () => user.getIdToken() });
  let selected = 'ladder';
  let selection = 0;
  async function refresh() {
    const current = ++selection;
    container.setAttribute('aria-busy', 'true'); container.textContent = 'Loading standings…';
    try { const rows = await loader.load(selected); if (current === selection) renderStandingsTable(container, selected, rows); }
    catch { if (current === selection) container.textContent = 'Standings are not available for this competition yet. Try again when league data is connected.'; }
    finally { if (current === selection) container.setAttribute('aria-busy', 'false'); }
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    selected = button.dataset.view;
    buttons.forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
    refresh();
  }));
  return { setContext: (context, ladder) => { loader.setContext(context, ladder); refresh(); }, clear: () => { selection++; loader.clear(); container.replaceChildren(); } };
}

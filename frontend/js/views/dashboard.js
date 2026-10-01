import { apiClient } from '../api_client.js';
import { renderRoute, resolveRoute } from '../router.js';
let mounted = false;
let standingsView;
let dashboardEpoch = 0;
let stopDashboard = () => {};
export function clearDashboard() { dashboardEpoch++; stopDashboard(); standingsView?.clear(); }
const slots = [['WFB', 3], ['CTR', 2], ['HLF', 2], ['EDG', 2], ['MID', 3], ['HOK', 1], ['INT', 4]];
const names = { draft_premiership: 'DML Draft Premiership', fantasy_cup: 'DML Fantasy Cup' };
function node(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = String(text ?? '—');
  if (className) element.className = className;
  return element;
}
export function renderRoster(players = []) {
  const target = document.getElementById('roster-grid-target');
  target.replaceChildren();
  for (const [position, count] of slots) {
    const row = node('div', '', 'position-row');
    const selected = players.filter(player => player.position === position);
    for (let i = 0; i < count; i++) {
      const badge = node('div', '', 'player-badge');
      badge.append(node('span', position + (count > 1 ? ` ${i + 1}` : ''), 'pos-num'), node('span', selected[i]?.name || 'Unassigned', 'player-name'));
      if (selected[i]) badge.append(node('span', `BE ${selected[i].breakEven ?? '—'} · PPM ${selected[i].ppm ?? '—'}`, 'player-stats'));
      row.append(badge);
    }
    target.append(row);
  }
}
export function renderFixtures(fixtures = []) {
  const target = document.getElementById('fixtures-target');
  target.replaceChildren();
  if (!fixtures.length) { target.append(node('p', 'Fixtures are not available yet.', 'widget-note')); return; }
  for (const fixture of fixtures) target.append(node('p', `${fixture.homeTeam} vs ${fixture.awayTeam}`, 'fixture-row'));
}
export async function mountDashboard(user) {
  if (mounted || !document.getElementById('season-select')) return;
  mounted = true;
  const epoch = dashboardEpoch;
  const { mountStandings } = await import('./standings.js');
  if (epoch !== dashboardEpoch) return;
  standingsView = mountStandings(user);
  const season = document.getElementById('season-select');
  let competitionType = 'draft_premiership';
  let controller;
  let requestId = 0;
  stopDashboard = () => { requestId++; controller?.abort(); };
  const status = document.getElementById('dashboard-status');
  const target = document.getElementById('competition-view');
  const switchButton = document.getElementById('switch-competition');
  async function load() {
    controller?.abort(); controller = new AbortController();
    const current = ++requestId;
    const year = Number(season.value);
    document.getElementById('competition-title').textContent = names[competitionType].toUpperCase();
    document.title = `${names[competitionType]} | HQ`;
    document.getElementById('awards-link').href = `#competition/${year}/${competitionType}/awards`;
    switchButton.textContent = `Switch to ${names[competitionType === 'draft_premiership' ? 'fantasy_cup' : 'draft_premiership']}`;
    renderRoster(); renderFixtures();
    standingsView.setContext({ season: year, competitionType, leagueId: null });
    document.getElementById('round-label').textContent = 'ROUND —';
    document.getElementById('news-target').replaceChildren(node('h3', 'THE NEXT CHAPTER OF DML'), node('p', 'Verified league updates will appear here when published.'));
    status.textContent = 'Loading your competition…';
    try {
      // Trusted API must verify this token and the user's league assignment.
      const token = await user.getIdToken();
      if (current !== requestId) return;
      const data = await apiClient.get(`/api/v1/competition/${year}/${competitionType}/dashboard`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
      if (current !== requestId) return;
      if (!data || typeof data.leagueId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(data.leagueId) || !Array.isArray(data.roster) || !Array.isArray(data.standings) || !Array.isArray(data.fixtures)) throw new Error('Invalid dashboard data');
      renderRoster(data.roster); renderFixtures(data.fixtures);
      standingsView.setContext({ season: year, competitionType, leagueId: data.leagueId }, data.standings);
      document.getElementById('round-label').textContent = `ROUND ${data.round ?? '—'}`;
      if (data.news?.title) document.getElementById('news-target').replaceChildren(node('h3', data.news.title), node('p', data.news.summary));
      status.textContent = 'Competition updated.';
    } catch {
      if (current === requestId) status.textContent = 'Live competition data is not connected yet. No scores or results are shown.';
    }
  }
  function route() {
    const resolved = resolveRoute(window.location.hash);
    if (resolved.view === 'competition' || resolved.view === 'awards') {
      const changed = season.value !== String(resolved.year) || competitionType !== resolved.competitionType;
      if (![...season.options].some(option => option.value === String(resolved.year))) season.add(new Option(String(resolved.year), String(resolved.year)));
      season.value = String(resolved.year); competitionType = resolved.competitionType;
      if (changed) load();
      renderRoute(target, window.location.hash).catch(() => { target.textContent = 'Awards could not be loaded. Please try again.'; });
    } else if (window.location.hash === '#dashboard') window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelectorAll('.bottom-nav a').forEach(link => {
      const active = link.hash === (window.location.hash || '#dashboard');
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
  }
  season.addEventListener('change', () => { window.location.hash = `competition/${season.value}/${competitionType}`; });
  switchButton.addEventListener('click', () => { window.location.hash = `competition/${season.value}/${competitionType === 'draft_premiership' ? 'fantasy_cup' : 'draft_premiership'}`; document.querySelector('.home-menu').open = false; });
  const dialog = document.getElementById('settings-dialog');
  document.getElementById('open-settings').addEventListener('click', () => dialog.showModal());
  document.getElementById('close-settings').addEventListener('click', () => dialog.close());
  window.addEventListener('hashchange', route);
  const initial = resolveRoute(window.location.hash);
  if (initial.view === 'competition' || initial.view === 'awards') route(); else load();
}

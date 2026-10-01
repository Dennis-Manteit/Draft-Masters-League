import { apiClient } from '../api_client.js';
let mounted = false;
export function mountCommissioner(user, claims) {
  if (mounted) return; mounted = true;
  const panel = document.getElementById('commissioner-panel'); panel.hidden = false;
  const league = document.getElementById('commissioner-league');
  for (const id of claims.dmlLeagueIds || []) { const option = document.createElement('option'); option.value = id; option.textContent = id; league.append(option); }
  const season = document.getElementById('commissioner-season'); const comp = document.getElementById('commissioner-comp');
  const status = document.getElementById('commissioner-status'); const target = document.getElementById('commissioner-drafts');
  let generation = 0; let controller;
  const scope = () => ({ leagueId: league.value, season: Number(season.value), competitionType: comp.value });
  const headers = async () => ({ Authorization: `Bearer ${await user.getIdToken()}` });
  async function load() {
    const current = ++generation; controller?.abort(); controller = new AbortController();
    target.replaceChildren();
    if (!league.value) { status.textContent = 'No league permissions have been assigned to this account yet.'; return; }
    status.textContent = 'Loading drafts…';
    try {
      const selected = scope(); const query = new URLSearchParams({ ...selected, season: String(selected.season) });
      const data = await apiClient.get(`/api/newsroom?${query}`, { headers: await headers(), signal: controller.signal });
      if (current !== generation) return;
      if (!Array.isArray(data.drafts)) throw new Error('Invalid draft response');
      for (const draft of data.drafts) {
        const card = document.createElement('article'); card.className = 'widget';
        const title = document.createElement('h2'); title.textContent = draft.title;
        const state = document.createElement('p'); state.textContent = String(draft.status).toUpperCase();
        const body = document.createElement('p'); body.className = 'draft-body'; body.textContent = draft.body;
        card.append(title, state, body);
        const next = { draft: ['review', 'Review draft', 'newsroom:review'], review: ['approved', 'Approve draft', 'newsroom:approve'], approved: ['published', 'Publish to DML newsroom', 'newsroom:publish'] }[draft.status];
        if (next && claims.dmlPermissions?.includes(next[2])) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = next[1];
          button.addEventListener('click', async () => {
            if (current !== generation) return;
            button.disabled = true;
            try {
              await apiClient.post('/api/newsroom', { ...selected, draftId: draft.draftId, version: draft.version, status: next[0] }, { headers: await headers() });
              if (current === generation) await load();
            } catch { if (current === generation) { status.textContent = 'This action could not be completed. Refresh to check permissions and the latest results.'; button.disabled = false; } }
          });
          card.append(button);
        }
        target.append(card);
      }
      status.textContent = data.drafts.length ? 'Drafts loaded. Publication is to DML only.' : 'There are no award drafts for this competition yet.';
    } catch { if (current === generation) status.textContent = 'The Commissioner service is not connected yet, or this account has no access. No action was saved.'; }
  }
  for (const select of [league, season, comp]) select.addEventListener('change', load);
  document.getElementById('load-drafts').addEventListener('click', load);
  load();
}

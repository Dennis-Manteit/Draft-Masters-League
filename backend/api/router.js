import { handleSaveRoundAwards } from './awards.js';
import { handleStandings } from './standings.js';
import { handleNewsroom } from './newsroom.js';
import { authenticate, competitionScope, requireLeagueAccess, scopePath, HttpError, jsonResponse, errorResponse } from '../core/permissions.js';
export function createApiHandler(dependencies) {
  return async request => {
    const url = new URL(request.url);
    if (url.pathname === '/api/v1/awards/round') return handleSaveRoundAwards(request, dependencies);
    if (url.pathname === '/api/newsroom') return handleNewsroom(request, dependencies);
    const standings = /^\/api\/v1\/competition\/(\d{4})\/(draft_premiership|fantasy_cup)\/standings\/(ladder|player-awards|coach-awards)$/.exec(url.pathname);
    if (standings) return handleStandings(request, { season: standings[1], competitionType: standings[2], view: standings[3] }, dependencies);
    const dashboard = /^\/api\/v1\/competition\/(\d{4})\/(draft_premiership|fantasy_cup)\/dashboard$/.exec(url.pathname);
    if (dashboard) {
      try {
        if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed');
        const identity = await authenticate(request, dependencies.auth);
        // A trusted per-account assignment selects the user's competition and squad.
        const assignment = await dependencies.db.doc(`account_competitions/${identity.uid}/selections/${dashboard[1]}_${dashboard[2]}`).get();
        if (!assignment.exists) throw new HttpError(404, 'No assigned competition');
        const scope = competitionScope({ leagueId: assignment.data().leagueId, season: Number(dashboard[1]), competitionType: dashboard[2] });
        requireLeagueAccess(identity, scope.leagueId);
        const root = scopePath(scope);
        const [squad, ladder, fixtures, news] = await Promise.all([
          dependencies.db.doc(`${root}/squads/${identity.uid}`).get(),
          dependencies.db.doc(`${root}/leaderboards/ladder`).get(),
          dependencies.db.doc(`${root}/dashboard/current`).get(),
          dependencies.db.collection(`${root}/newsroom_posts`).orderBy('publishedAt', 'desc').limit(1).get(),
        ]);
        const roundData = fixtures.exists ? fixtures.data() : {};
        const newsItem = news.docs[0]?.data();
        return jsonResponse({ leagueId: scope.leagueId, roster: squad.exists ? squad.data().players ?? [] : [], standings: ladder.exists ? (ladder.data().rows ?? []).map(row => ({ rank: row.rank ?? null, name: row.name ?? '', pts: row.pts ?? 0, pointsFor: row.pointsFor ?? 0 })) : [], fixtures: roundData.fixtures ?? [], round: roundData.round ?? null, news: newsItem ? { title: newsItem.title, summary: newsItem.body } : null });
      } catch (error) { return errorResponse(error); }
    }
    return jsonResponse({ error: 'Route not found' }, 404);
  };
}

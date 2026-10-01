import { authenticate, competitionScope, requireLeagueAccess, scopePath, HttpError, jsonResponse, errorResponse } from '../core/permissions.js';
const fields = { ladder: ['rank', 'name', 'pts', 'pointsFor'], 'player-awards': ['rank', 'playerName', 'playerOfTheMatch', 'playerOfTheRound', 'teamOfTheWeek', 'totalPoints'], 'coach-awards': ['rank', 'coachName', 'franchiseName', 'playOfTheMatch', 'performanceOfTheWeek', 'coachOfTheRound', 'totalPoints'] };
const views = new Set(Object.keys(fields));
// Wire to GET /api/v1/competition/:season/:competitionType/standings/:view?leagueId=...
export async function handleStandings(request, parameters, { auth, db }) {
  try {
    if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed');
    const identity = await authenticate(request, auth);
    const scope = competitionScope({ ...parameters, season: Number(parameters.season), leagueId: new URL(request.url).searchParams.get('leagueId') });
    requireLeagueAccess(identity, scope.leagueId);
    if (!views.has(parameters.view)) throw new HttpError(400, 'Invalid standings view');
    const snapshot = await db.doc(`${scopePath(scope)}/leaderboards/${parameters.view}`).get();
    if (!snapshot.exists) throw new HttpError(404, 'Standings are not available yet');
    const data = snapshot.data();
    if (!Array.isArray(data.rows) || data.rows.length > 1000 || Object.entries(scope).some(([key, value]) => data[key] !== value)) throw new HttpError(409, 'Standings are unavailable');
    const rows = data.rows.map(row => {
      if (!row || typeof row !== 'object') throw new HttpError(409, 'Standings are unavailable');
      const publicRow = {};
      for (const key of fields[parameters.view]) {
        const value = row[key];
        if (value == null) continue;
        if (!(typeof value === 'string' && value.length <= 160) && !(typeof value === 'number' && Number.isFinite(value))) throw new HttpError(409, 'Standings are unavailable');
        publicRow[key] = value;
      }
      return publicRow;
    });
    return jsonResponse({ ...scope, view: parameters.view, rows });
  } catch (error) { return errorResponse(error); }
}

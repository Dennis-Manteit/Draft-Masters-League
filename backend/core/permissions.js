export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function competitionScope(input) {
  const { leagueId, season, competitionType } = input ?? {};
  if (typeof leagueId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(leagueId)
    || !Number.isInteger(season) || season < 2020 || season > 2100
    || !['draft_premiership', 'fantasy_cup'].includes(competitionType)) throw new HttpError(400, 'Invalid competition');
  return { leagueId, season, competitionType };
}
export function requireLeagueAccess(identity, leagueId) {
  if (!identity?.uid || identity.email_verified !== true) throw new HttpError(403, 'Verified account required');
  if (!Array.isArray(identity.dmlLeagueIds) || !identity.dmlLeagueIds.includes(leagueId)) throw new HttpError(403, 'League access denied');
}
export function requireAwardsWrite(identity, leagueId) {
  requireLeagueAccess(identity, leagueId);
  if (identity.commissioner !== true || !Array.isArray(identity.dmlPermissions) || !identity.dmlPermissions.includes('awards:write')) throw new HttpError(403, 'Awards permission required');
}
export async function authenticate(request, auth) {
  const header = request.headers.get('authorization') || '';
  if (!/^Bearer \S+$/.test(header)) throw new HttpError(401, 'Authentication required');
  try { return await auth.verifyIdToken(header.slice(7), true); }
  catch { throw new HttpError(401, 'Authentication required'); }
}
export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function errorResponse(error) {
  return jsonResponse({ error: error instanceof HttpError ? error.message : 'Request could not be completed' }, error instanceof HttpError ? error.status : 500);
}
export function scopePath({ leagueId, season, competitionType }) {
  return `leagues/${leagueId}/seasons/${season}/competitions/${competitionType}`;
}

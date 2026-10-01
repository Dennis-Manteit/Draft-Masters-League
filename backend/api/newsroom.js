import { authenticate, competitionScope, scopePath, HttpError, errorResponse, jsonResponse } from '../core/permissions.js';
import { requireNewsroomPermission, transitionDraft } from '../services/newsroom_review.js';
export async function handleNewsroom(request, { auth, db }) {
  try {
    const identity = await authenticate(request, auth);
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const scope = competitionScope({ leagueId: url.searchParams.get('leagueId'), season: Number(url.searchParams.get('season')), competitionType: url.searchParams.get('competitionType') });
      requireNewsroomPermission(identity, scope.leagueId, 'newsroom:review');
      const snapshot = await db.collection(`${scopePath(scope)}/newsroom_drafts`).orderBy('createdAt', 'desc').limit(50).get();
      const drafts = snapshot.docs.map(doc => {
        const draft = doc.data();
        return { draftId: doc.id, title: draft.title, body: draft.body, status: draft.status, version: draft.version ?? 0, source: draft.source };
      });
      return jsonResponse({ drafts });
    }
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'JSON required');
    if (Number(request.headers.get('content-length')) > 2048) throw new HttpError(413, 'Request too large');
    const text = await request.text();
    if (text.length > 2048) throw new HttpError(413, 'Request too large');
    let input; try { input = JSON.parse(text); } catch { throw new HttpError(400, 'Invalid request'); }
    if (!input || Object.keys(input).some(key => !['leagueId', 'season', 'competitionType', 'draftId', 'version', 'status'].includes(key))) throw new HttpError(400, 'Invalid request');
    return jsonResponse(await transitionDraft(input, { identity, db }));
  } catch (error) { return errorResponse(error); }
}

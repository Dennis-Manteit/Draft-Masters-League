import { authenticate, HttpError, jsonResponse, errorResponse } from '../core/permissions.js';
import { saveRoundAwards } from '../services/awards.js';
// Wire to the approved server's POST /api/v1/awards/round endpoint.
export async function handleSaveRoundAwards(request, { auth, db }) {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const identity = await authenticate(request, auth);
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'JSON required');
    if (!request.body) throw new HttpError(400, 'Invalid request');
    const reader = request.body.getReader();
    const chunks = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2048) { await reader.cancel(); throw new HttpError(413, 'Request too large'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = new TextDecoder().decode(bytes);
    let input; try { input = JSON.parse(body); } catch { throw new HttpError(400, 'Invalid request'); }
    if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['leagueId', 'season', 'competitionType', 'round', 'revision'].includes(key))) throw new HttpError(400, 'Invalid request');
    return jsonResponse(await saveRoundAwards(input, { identity, db }));
  } catch (error) { return errorResponse(error); }
}

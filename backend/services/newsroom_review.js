import { competitionScope, requireLeagueAccess, scopePath, HttpError } from '../core/permissions.js';
export function requireNewsroomPermission(identity, leagueId, permission) {
  requireLeagueAccess(identity, leagueId);
  if (identity.commissioner !== true || !identity.dmlPermissions?.includes(permission)) throw new HttpError(403, 'Commissioner newsroom permission required');
}
export async function transitionDraft(input, { identity, db, now = () => new Date().toISOString() }) {
  const scope = competitionScope(input);
  const permissions = { review: 'newsroom:review', approved: 'newsroom:approve', published: 'newsroom:publish' };
  if (!permissions[input.status] || !Number.isInteger(input.version) || input.version < 0 || !/^round-\d{1,2}-awards-v\d{1,7}$/.test(input.draftId || '')) throw new HttpError(400, 'Invalid transition');
  requireNewsroomPermission(identity, scope.leagueId, permissions[input.status]);
  const ref = db.doc(`${scopePath(scope)}/newsroom_drafts/${input.draftId}`);
  const timestamp = now();
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpError(404, 'Draft not found');
    const draft = snapshot.data();
    if (!draft.source || Object.entries(scope).some(([key, value]) => draft.source[key] !== value)) throw new HttpError(409, 'Draft does not match this competition');
    const officialRef = db.doc(`${scopePath(scope)}/round_awards/${draft.source.round}`);
    const official = await transaction.get(officialRef);
    const verified = await transaction.get(db.doc(`${scopePath(scope)}/verified_round_results/${draft.source.round}`));
    if (!verified.exists || verified.data().status !== 'verified' || verified.data().revision !== draft.source.revision) throw new HttpError(409, 'Verified award results changed');
    if (!official.exists || official.data().revision !== draft.source.revision) throw new HttpError(409, 'Award results changed; review the latest draft');
    if ((draft.version ?? 0) !== input.version) throw new HttpError(409, 'Draft changed; reload before continuing');
    const next = { draft: 'review', review: 'approved', approved: 'published' }[draft.status];
    if (next !== input.status) throw new HttpError(409, 'Draft must pass review and approval before publication');
    const updated = { ...draft, status: next, version: input.version + 1, updatedAt: timestamp, updatedBy: identity.uid };
    if (next === 'approved') updated.approvedBy = identity.uid;
    if (next === 'published') {
      if (!draft.approvedBy) throw new HttpError(409, 'Commissioner approval required');
      updated.publishedAt = timestamp;
      transaction.set(db.doc(`${scopePath(scope)}/newsroom_posts/${input.draftId}`), { title: draft.title, body: draft.body, competition: draft.competition, source: draft.source, publishedAt: timestamp });
    }
    transaction.set(ref, updated);
    return { draftId: input.draftId, status: next, version: updated.version };
  });
}

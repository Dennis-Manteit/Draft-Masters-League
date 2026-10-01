import { competitionScope, requireAwardsWrite, scopePath, HttpError } from '../core/permissions.js';
import { createAwardsAnnouncement } from './newsroom.js';
export async function saveRoundAwards(input, { identity, db, now = () => new Date().toISOString() }) {
  const scope = { ...competitionScope(input), round: input.round };
  if (!Number.isInteger(scope.round) || scope.round < 1 || scope.round > 40 || !Number.isInteger(input.revision) || input.revision < 1 || input.revision > 1_000_000) throw new HttpError(400, 'Invalid round or revision');
  requireAwardsWrite(identity, scope.leagueId);
  const root = scopePath(scope);
  const officialRef = db.doc(`${root}/verified_round_results/${scope.round}`);
  const savedRef = db.doc(`${root}/round_awards/${scope.round}`);
  const draftId = `round-${scope.round}-awards-v${input.revision}`;
  const draftRef = db.doc(`${root}/newsroom_drafts/${draftId}`);
  // Both records commit together. A retry cannot create another announcement.
  return db.runTransaction(async transaction => {
    const officialSnapshot = await transaction.get(officialRef);
    const savedSnapshot = await transaction.get(savedRef);
    const draftSnapshot = await transaction.get(draftRef);
    const official = officialSnapshot.exists ? officialSnapshot.data() : null;
    if (!official || official.status !== 'verified' || official.revision !== input.revision
      || Object.entries(scope).some(([key, value]) => official[key] !== value)) throw new HttpError(409, 'Verified round results do not match');
    const saved = savedSnapshot.exists ? savedSnapshot.data() : null;
    if (saved && saved.revision > input.revision) throw new HttpError(409, 'A newer awards revision exists');
    if (saved?.revision === input.revision && draftSnapshot.exists) return { saved: false, draftId, revision: input.revision };
    // Never overwrite an existing reviewed/published announcement.
    if (draftSnapshot.exists) throw new HttpError(409, 'This announcement revision already exists');
    const announcement = createAwardsAnnouncement(scope, official);
    const timestamp = now();
    transaction.set(savedRef, { ...scope, revision: input.revision, playerAwards: announcement.playerAwards, coachAwards: announcement.coachAwards, draftId, savedAt: timestamp, savedBy: identity.uid });
    transaction.set(draftRef, { ...announcement, createdAt: timestamp, createdBy: identity.uid });
    return { saved: true, draftId, revision: input.revision };
  });
}

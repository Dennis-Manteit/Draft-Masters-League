import { HttpError } from '../core/permissions.js';
const competitionNames = { draft_premiership: 'DML Draft Premiership', fantasy_cup: 'DML Fantasy Cup' };
function winnerList(awards) {
  if (!Array.isArray(awards) || awards.length > 100) throw new HttpError(409, 'Official award results are incomplete');
  return awards.map(award => {
    if (!award || !['award', 'winnerId', 'winnerName'].every(key => typeof award[key] === 'string' && award[key].trim() && award[key].length <= 160)) throw new HttpError(409, 'Official award results are incomplete');
    return { award: award.award, winnerId: award.winnerId, winnerName: award.winnerName };
  });
}
// Deterministic draft from trusted results. No external AI, publishing or HTTP call.
export function createAwardsAnnouncement(scope, official) {
  const playerAwards = winnerList(official.playerAwards);
  const coachAwards = winnerList(official.coachAwards);
  if (!playerAwards.length && !coachAwards.length) throw new HttpError(409, 'Official award results are incomplete');
  const section = (title, awards) => awards.length ? `${title}\n${awards.map(a => `${a.award}: ${a.winnerName}`).join('\n')}` : '';
  return {
    title: `Round ${scope.round} Official Awards`,
    competition: `${competitionNames[scope.competitionType]} ${scope.season}`,
    category: 'ANNOUNCEMENT', status: 'draft', approvalRequired: true,
    body: [section('Player awards', playerAwards), section('Coach awards', coachAwards)].filter(Boolean).join('\n\n'),
    playerAwards, coachAwards,
    source: { ...scope, revision: official.revision },
  };
}

export function render(target, { year, competitionType }) {
  const name = competitionType === 'draft_premiership' ? 'DML Draft Premiership' : 'DML Fantasy Cup';
  target.textContent = `${name} — ${year}. Competition data is not available in the app yet.`;
}

export function render(target, { year, competitionType }) {
  const name = competitionType === 'draft_premiership' ? 'DML Draft Premiership' : 'DML Fantasy Cup';
  target.textContent = `${name} awards — ${year}. Award results are not available in the app yet.`;
}

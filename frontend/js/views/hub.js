export function mountHub() {
  const chooser = document.getElementById('competition-chooser');
  if (!chooser) return;
  chooser.querySelectorAll('[data-competition]').forEach(button => button.addEventListener('click', () => {
    window.location.hash = `competition/${document.getElementById('season-select').value}/${button.dataset.competition}`;
    document.getElementById('competition-title').scrollIntoView({ block: 'start' });
  }));
}

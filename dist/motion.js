const button = document.querySelector('#motionToggle');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = false;
try { paused = localStorage.getItem('library-motion-paused') === 'true'; } catch {}
function updateMotion() {
  const stopped = paused || reduced.matches;
  document.documentElement.classList.toggle('motion-paused', stopped || document.hidden);
  button.setAttribute('aria-pressed', String(stopped));
  button.textContent = reduced.matches ? 'Анімації вимкнено системою' : paused ? 'Увімкнути анімації' : 'Призупинити анімації';
  button.disabled = reduced.matches;
}
button.addEventListener('click', () => {
  paused = !paused;
  try { localStorage.setItem('library-motion-paused', String(paused)); } catch {}
  updateMotion();
});
reduced.addEventListener('change', updateMotion);
document.addEventListener('visibilitychange', updateMotion);
updateMotion();

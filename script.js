const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');
const heroVideo = document.querySelector('.hero-video');
const soundButton = document.querySelector('.sound-toggle');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation?.classList.toggle('open', !isOpen);
  menuButton.setAttribute('aria-label', isOpen ? 'Открыть меню' : 'Закрыть меню');
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Открыть меню');
  });
});

soundButton?.addEventListener('click', async () => {
  if (!heroVideo) return;
  heroVideo.muted = !heroVideo.muted;
  soundButton.setAttribute('aria-pressed', String(!heroVideo.muted));
  soundButton.querySelector('span:last-child').textContent = heroVideo.muted ? 'ЗВУК ВЫКЛЮЧЕН' : 'ЗВУК ВКЛЮЧЁН';
  soundButton.querySelector('.sound-icon').textContent = heroVideo.muted ? '◖' : '◖))';
  if (!heroVideo.muted) {
    try { await heroVideo.play(); } catch { heroVideo.muted = true; }
  }
});

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
} else {
  document.querySelectorAll('.reveal').forEach((element) => element.classList.add('is-visible'));
}

heroVideo?.addEventListener('error', () => {
  heroVideo.classList.add('video-unavailable');
});

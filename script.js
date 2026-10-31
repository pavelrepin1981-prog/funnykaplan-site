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

// Hero video: loaded in small pieces (1–2 s each) so mobile networks don't stall on one big file.
// The photo underneath stays visible until the video actually plays.
const heroMotion = document.querySelector('.hero-motion');

async function startHeroMotion(video) {
  const connection = navigator.connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // m: vertical crop for phones, 480/720: full frame for wider screens
  const portrait = window.innerHeight > window.innerWidth;
  const small = window.innerWidth <= 900 || connection?.effectiveType === '3g';
  const variant = portrait ? 'm' : small ? '480' : '720';
  const base = `${video.dataset.src}/${variant}/`;
  const MS = window.ManagedMediaSource || window.MediaSource;
  const codec = `video/mp4; codecs="avc1.4D00${variant === 'm' ? '1E' : '1F'}"`;

  video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
  const play = () => video.play().catch(() => {});

  if (!MS || !MS.isTypeSupported(codec)) {
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = `${base}index.m3u8`;
      play();
    }
    return;
  }

  const fetchPart = async (name) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(base + name);
        if (response.ok) return await response.arrayBuffer();
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
    throw new Error(`hero video part failed: ${name}`);
  };

  const playlist = await (await fetch(`${base}index.m3u8`)).text();
  const parts = playlist.split('\n').filter((line) => line.endsWith('.m4s'));
  const source = new MS();
  video.disableRemotePlayback = true;
  video.src = URL.createObjectURL(source);
  await new Promise((resolve) => source.addEventListener('sourceopen', resolve, { once: true }));
  const buffer = source.addSourceBuffer(codec);
  const append = (data) => new Promise((resolve, reject) => {
    buffer.addEventListener('updateend', resolve, { once: true });
    buffer.addEventListener('error', reject, { once: true });
    buffer.appendBuffer(data);
  });

  await append(await fetchPart('init.mp4'));
  for (let i = 0; i < parts.length; i += 1) {
    await append(await fetchPart(parts[i]));
    if (i === 1) play();
  }
  source.endOfStream();
  play();
}

// High-quality single file (Dropbox) first; if it doesn't start within a few seconds, use the light pieces.
function startHeroHq(video) {
  const portrait = window.innerHeight > window.innerWidth;
  const url = portrait ? video.dataset.hqPhone : video.dataset.hqDesktop;
  if (!url || navigator.connection?.saveData) return Promise.reject(new Error('no hq video'));
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      video.removeAttribute('src');
      video.load();
      reject(new Error('hq video did not start'));
    };
    const timer = setTimeout(fail, 8000);
    video.addEventListener('playing', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.classList.add('is-playing');
      resolve();
    }, { once: true });
    video.addEventListener('error', () => { clearTimeout(timer); fail(); }, { once: true });
    video.preload = 'auto';
    video.src = url;
    video.play().catch(() => {});
  });
}

if (heroMotion) {
  const go = () => startHeroHq(heroMotion)
    .catch(() => startHeroMotion(heroMotion))
    .catch(() => heroMotion.classList.remove('is-playing'));
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}

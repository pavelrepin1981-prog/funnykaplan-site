const PHONE = '79676339597';
const TELEGRAM = 'https://t.me/coverdirector';
const MAX = 'https://max.ru/u/f9LHodD0cOKfcdjd2ppBzg4iQEwbgHk0iquFp7_BmPjeUXAFemdJBGRdPQs';
const SECRET_SONG = 'ВЕТЕР В ГОЛОВЕ';
// Исполнители из реестра иноагентов Минюста РФ (сверено 01.11.2026):
// Лёва Би-2, А. Макаревич, М. Покровский, Земфира, Б. Гребенщиков
const FOREIGN_AGENTS = new Set(['БИ2', 'МАШИНА ВРЕМЕНИ', 'НОГУ СВЕЛО', 'ЗЕМФИРА', 'АКВАРИУМ']);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 4200);
}

/* ===== Появление блоков и счётчики ===== */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function countUp(el) {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  if (reduceMotion || !target) return;
  const start = performance.now();
  const duration = 1400;
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    $$('[data-count]', entry.target).forEach(countUp);
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
$$('.reveal').forEach((el) => revealObserver.observe(el));

/* ===== Подсветка активного раздела в навигации ===== */
const navLinks = $$('.nav-links a');
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach((a) => {
  const section = $(a.getAttribute('href'));
  if (section) sectionObserver.observe(section);
});

/* ===== Промо-видео ===== */
// Промо живёт на RuTube: плеер подгружается только по клику, чтобы не тормозить страницу
const promo = $('#promo');
const promoPlayer = $('#promoPlayer');
$$('[data-play-promo]').forEach((btn) => {
  btn.addEventListener('click', () => {
    promo.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    if (!promoPlayer.firstChild) {
      const frame = document.createElement('iframe');
      frame.src = promoPlayer.dataset.src + '?autoplay=1';
      frame.title = 'Фанни Каплан — PROMO 2026';
      frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      frame.allowFullscreen = true;
      promoPlayer.append(frame);
    }
    promo.classList.add('playing');
  });
});

// Фон hero: фото, а поверх него как можно раньше — видео с Dropbox
// (вертикальное для телефона, горизонтальное для экрана). Фото остаётся, пока видео не пошло.
// Не ждём загрузки всей страницы: шрифт и фото ниже первого экрана задерживали старт на секунды.
const heroVideo = $('.hero-video');
function startHeroVideo() {
  if (reduceMotion || navigator.connection?.saveData) return;
  const portrait = window.innerHeight > window.innerWidth;
  heroVideo.src = portrait ? heroVideo.dataset.phone : heroVideo.dataset.desktop;
  heroVideo.addEventListener('playing', () => heroVideo.classList.add('is-playing'), { once: true });
  heroVideo.play().catch(() => {});
  // Не тратим ресурсы, пока hero за пределами экрана
  new IntersectionObserver(([entry]) => {
    entry.isIntersecting ? heroVideo.play().catch(() => {}) : heroVideo.pause();
  }).observe(heroVideo);
}
startHeroVideo();

/* ===== Репертуар и «мой сет-лист» ===== */
// Песни по алфавиту названия: сначала русские, потом зарубежные
const byTitle = (a, b) => a.t.localeCompare(b.t, 'ru');
const songs = (window.SONGS || []).map((s, i) => ({
  ...s,
  id: i,
  en: /[A-Z]/.test(s.t) && !/[А-ЯЁ]/i.test(s.t),
}));
const ordered = [...songs].sort(byTitle);
const picked = new Set();
let filter = 'all';
let format = 'all';
let query = '';
const list = $('#songList');

const pretty = (s) => s.toLowerCase();

function renderSongs() {
  const q = query.trim().toLowerCase();
  const items = ordered.filter((s) => {
    if (filter === 'ru' && s.en) return false;
    if (filter === 'en' && !s.en) return false;
    if (format !== 'all' && !s.f.includes(format)) return false;
    if (filter === 'picked' && !picked.has(s.id)) return false;
    return !q || (s.a + ' ' + s.t).toLowerCase().includes(q);
  });

  list.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'song-empty';
    empty.textContent = filter === 'picked'
      ? 'Пока пусто. Нажимайте «+» у песен, которые ждут ваши гости.'
      : 'Такой песни нет в списке — напишите нам, скорее всего выучим.';
    list.append(empty);
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach((s) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'song' + (s.t === SECRET_SONG ? ' secret' : '');
    btn.setAttribute('aria-pressed', picked.has(s.id));
    btn.dataset.id = s.id;
    btn.innerHTML = '<span class="song-text"><b></b><small></small></span><span class="song-add" aria-hidden="true"></span>';
    btn.querySelector('b').textContent = pretty(s.t);
    const small = btn.querySelector('small');
    small.textContent = s.a;
    if (FOREIGN_AGENTS.has(s.a)) {
      const mark = document.createElement('span');
      mark.className = 'agent-mark';
      mark.textContent = '*';
      small.append(mark);
    }
    small.append(' · ' + s.f.join(', '));
    btn.querySelector('.song-add').textContent = picked.has(s.id) ? '✓' : '+';
    li.append(btn);
    frag.append(li);
  });
  list.append(frag);
}

function updatePicked() {
  $('#pickedCount').textContent = picked.size;
  const note = $('#pickedNote');
  if (picked.size) {
    note.hidden = false;
    note.textContent = `В заявку добавим ваш сет-лист: ${picked.size} ${plural(picked.size, ['песня', 'песни', 'песен'])}.`;
  } else {
    note.hidden = true;
  }
}

function plural(n, forms) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
  return forms[2];
}

list.addEventListener('click', (e) => {
  const btn = e.target.closest('.song');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (picked.has(id)) picked.delete(id); else picked.add(id);
  const on = picked.has(id);
  btn.setAttribute('aria-pressed', on);
  btn.querySelector('.song-add').textContent = on ? '✓' : '+';
  if (on && songs[id].t === SECRET_SONG) toast('Да, это она — «Жаль, промахнулась Фанни Каплан». Отсюда и имя.');
  if (filter === 'picked') renderSongs();
  updatePicked();
});

$('#songSearch').addEventListener('input', (e) => { query = e.target.value; renderSongs(); });
$$('[data-filter]').forEach((chip) => chip.addEventListener('click', () => {
  $$('[data-filter]').forEach((c) => c.classList.toggle('active', c === chip));
  filter = chip.dataset.filter;
  renderSongs();
}));
$$('[data-format-filter]').forEach((chip) => chip.addEventListener('click', () => {
  $$('[data-format-filter]').forEach((c) => c.classList.toggle('active', c === chip));
  format = chip.dataset.formatFilter;
  renderSongs();
}));
renderSongs();

/* ===== Галерея ===== */
const gallery = $('#gallery');
$$('[data-scroll]').forEach((btn) => btn.addEventListener('click', () => {
  gallery.scrollBy({ left: Number(btn.dataset.scroll) * gallery.clientWidth * 0.7, behavior: 'smooth' });
}));

/* ===== Выбор формата из карточек ===== */
const form = $('#bookingForm');
$$('[data-format]').forEach((a) => a.addEventListener('click', () => {
  form.elements.format.value = a.dataset.format;
}));

/* ===== Заявка: собираем сообщение и отправляем в WhatsApp ===== */
// Telegram и MAX не принимают текст в ссылке на личный чат — эти кнопки просто открывают чат, без проверки формы
$$('[data-chat]', form).forEach((btn) => btn.addEventListener('click', () => {
  window.open(btn.dataset.chat === 'max' ? MAX : TELEGRAM, '_blank', 'noopener');
}));

function formatDate(value) {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  return `${d}.${m}.${y}`;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = form.elements;
  const error = $('#formError');
  if (!f.date.value || !f.name.value.trim()) {
    error.hidden = false;
    (f.date.value ? f.name : f.date).focus();
    return;
  }
  error.hidden = true;

  const lines = [
    'Здравствуйте! Хочу пригласить «Фанни Каплан».',
    `Дата: ${formatDate(f.date.value)}`,
    `Город: ${f.city.value.trim() || '—'}`,
    `Событие: ${f.event.value}`,
    `Формат: ${f.format.value}`,
  ];
  if (f.guests.value) lines.push(`Гостей: ~${f.guests.value}`);
  if (picked.size) {
    lines.push('', 'Наш сет-лист:');
    [...picked].map((id) => songs[id]).sort(byTitle).forEach((s) => lines.push(`— ${s.a} – ${s.t}`));
  }
  lines.push('', `Меня зовут ${f.name.value.trim()}.`);
  const text = lines.join('\n');
  window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
});

/* ===== Мобильная липкая кнопка: видна после hero, прячется у формы ===== */
const sticky = $('#stickyCta');
const hero = $('.hero');
const booking = $('#booking');
let heroVisible = true;
let bookingVisible = false;
const syncSticky = () => sticky.classList.toggle('show', !heroVisible && !bookingVisible);
new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; syncSticky(); }).observe(hero);
new IntersectionObserver(([entry]) => { bookingVisible = entry.isIntersecting; syncSticky(); }, { threshold: 0.1 }).observe(booking);

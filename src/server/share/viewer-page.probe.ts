import { SHARE_NAME_MAX } from "../../shared/share.js";

const LIVE_SCRIPT = `
(() => {
  const base = location.pathname.replace(/\\/+$/, '');
  const badge = document.getElementById('live-badge');
  const nameInput = document.getElementById('viewer-name');
  let key = null;
  let rev = Number(document.body.dataset.rev || 0);
  let pending = null;
  let timer = 0;
  let studio = null;
  const shots = () => Array.from(document.querySelectorAll('.shot'));
  const flush = () => {
    timer = 0;
    if (!key || !pending) return;
    const body = Object.assign({ key, name: (nameInput.value || '').trim().slice(0, ${SHARE_NAME_MAX}) }, pending);
    pending = null;
    fetch(base + '/cursor', { method: 'POST', credentials: 'omit', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => undefined);
  };
  const queue = (value) => { pending = value; if (!timer) timer = setTimeout(flush, 50); };
  shots().forEach((shot) => {
    shot.addEventListener('pointermove', (event) => {
      const box = shot.getBoundingClientRect();
      const x = Math.max(0, Math.round((event.clientX - box.left) / box.width * Number(shot.dataset.w)));
      const y = Math.max(0, Math.round((event.clientY - box.top) / box.height * Number(shot.dataset.h)));
      queue({ frame: Number(shot.dataset.i), x, y });
    });
    shot.addEventListener('pointerleave', () => queue({ frame: null, x: 0, y: 0 }));
  });
  const arrow = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1l5.5 13 2-5.5L14 6.5z" fill="currentColor" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  const drawStudio = (data) => {
    if (!data) { if (studio) studio.remove(); studio = null; return; }
    const shot = document.querySelector('.shot[data-i="' + data.frame + '"]');
    if (!shot) return;
    if (!studio) {
      studio = document.createElement('div');
      studio.className = 'cursor';
      studio.style.color = 'var(--studio)';
      studio.innerHTML = arrow;
      const tag = document.createElement('span'); tag.textContent = 'Designer'; studio.append(tag);
    }
    if (studio.parentElement !== shot) shot.append(studio);
    studio.style.left = (data.x / Number(shot.dataset.w) * 100) + '%';
    studio.style.top = (data.y / Number(shot.dataset.h) * 100) + '%';
  };
  const swap = (data) => {
    rev = data.rev;
    data.frames.forEach((f, i) => {
      const shot = document.querySelector('.shot[data-i="' + i + '"]');
      if (!shot) return;
      const img = shot.querySelector('img');
      const next = new Image();
      next.onload = () => { shot.dataset.h = String(f.cssHeight); img.height = f.cssHeight; img.src = next.src; };
      next.src = base + '/f/' + i + '?r=' + rev;
    });
    badge.textContent = 'Live · updated ' + new Date().toLocaleTimeString();
  };
  const source = new EventSource(base + '/live');
  source.addEventListener('hello', (e) => { const d = JSON.parse(e.data); key = d.key; badge.classList.remove('off'); badge.textContent = 'Live'; if (d.rev !== rev) location.reload(); });
  source.addEventListener('frames', (e) => swap(JSON.parse(e.data)));
  source.addEventListener('studio', (e) => drawStudio(JSON.parse(e.data)));
  source.addEventListener('end', () => stop('This link was turned off. Ask the person who shared it for a new link.'));
  let misses = 0;
  const stop = (text) => {
    source.close();
    badge.classList.add('off');
    badge.textContent = 'Off';
    const note = document.createElement('p');
    note.className = 'ended';
    note.textContent = text;
    document.querySelector('main').replaceChildren(note);
  };
  const probe = () => fetch(base + '/comments', { credentials: 'omit' }).then((r) => {
    misses = 0;
    if (r.status === 404) location.reload();
  }).catch(() => {
    misses += 1;
    if (misses >= 3) stop('This link no longer answers. It was turned off, it ended, or Design Studio closed.');
    else setTimeout(probe, 1000);
  });
  source.onerror = () => {
    key = null; badge.classList.add('off'); badge.textContent = 'Reconnecting'; drawStudio(null);
    if (misses === 0) probe();
  };
})();
`;

const SCRIPT = `
(() => {
  const data = JSON.parse(document.getElementById('share-data').textContent);
  const base = location.pathname.replace(/\\/+$/, '');
  const form = document.getElementById('comment-form');
  const nameInput = document.getElementById('viewer-name');
  const textInput = document.getElementById('viewer-text');
  const where = document.getElementById('comment-where');
  const error = document.getElementById('comment-error');
  const list = document.getElementById('comment-list');
  const empty = document.getElementById('comment-empty');
  const send = document.getElementById('comment-send');
  let spot = null;
  try { nameInput.value = localStorage.getItem('share-viewer-name') || ''; } catch (e) {}
  const draftPin = document.createElement('span');
  draftPin.className = 'pin';
  draftPin.textContent = '+';
  const place = (shot, x, y, el) => { el.style.left = (x / shot.dataset.w * 100) + '%'; el.style.top = (y / shot.dataset.h * 100) + '%'; shot.append(el); };
  document.querySelectorAll('.shot').forEach((shot) => {
    shot.addEventListener('click', (event) => {
      const box = shot.getBoundingClientRect();
      const x = Math.round((event.clientX - box.left) / box.width * Number(shot.dataset.w));
      const y = Math.round((event.clientY - box.top) / box.height * Number(shot.dataset.h));
      spot = { frame: Number(shot.dataset.i), x, y };
      place(shot, x, y, draftPin);
      where.textContent = 'Pinned on ' + data.frames[spot.frame].name;
      (nameInput.value ? textInput : nameInput).focus();
    });
  });
  const render = (comments) => {
    document.querySelectorAll('.pin.saved').forEach((p) => p.remove());
    list.replaceChildren();
    empty.hidden = comments.length > 0;
    for (const c of comments) {
      const li = document.createElement('li');
      const who = document.createElement('span'); who.className = 'who'; who.textContent = '#' + c.n + ' ' + c.author;
      const at = document.createElement('div'); at.className = 'where'; at.textContent = (data.frames[c.frame] ? data.frames[c.frame].name : '') + ' · ' + new Date(c.createdAt).toLocaleString();
      const p = document.createElement('p'); p.textContent = c.text;
      li.append(who, at, p); list.append(li);
      const shot = document.querySelector('.shot[data-i="' + c.frame + '"]');
      if (shot && c.x !== null) { const pin = document.createElement('span'); pin.className = 'pin saved'; pin.textContent = c.n; place(shot, c.x, c.y, pin); }
    }
  };
  const load = () => fetch(base + '/comments', { credentials: 'omit' }).then((r) => r.ok ? r.json() : { comments: [] }).then((d) => render(d.comments)).catch(() => undefined);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    if (!name) { error.textContent = 'Type your name.'; nameInput.focus(); return; }
    if (!text) { error.textContent = 'Type a comment.'; textInput.focus(); return; }
    send.disabled = true;
    try {
      const body = { name, text, frame: spot ? spot.frame : 0, x: spot ? spot.x : null, y: spot ? spot.y : null };
      const r = await fetch(base + '/comments', { method: 'POST', credentials: 'omit', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); error.textContent = d.error || 'The comment was not sent.'; return; }
      try { localStorage.setItem('share-viewer-name', name); } catch (e) {}
      textInput.value = ''; spot = null; draftPin.remove(); where.textContent = 'Click a frame to pin your comment, or send it without a spot.';
      await load();
    } finally { send.disabled = false; }
  });
  load();
})();
`;

export { LIVE_SCRIPT, SCRIPT };

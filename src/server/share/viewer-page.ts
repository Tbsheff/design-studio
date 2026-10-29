import type { ShareFrame } from '../../shared/share.js';
import { SHARE_COMMENT_MAX, SHARE_NAME_MAX } from '../../shared/share.js';

export interface ViewerData {
  base: string;
  title: string;
  expiresAt: number;
  frames: ShareFrame[];
  live?: boolean;
  rev?: number;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

const STYLE = `
:root { color-scheme: light dark; --bg: #f6f6f4; --panel: #ffffff; --line: #e3e3df; --text: #1d1d1b; --muted: #6b6b66; --accent: #2f6bff; --accent-text: #ffffff; --pin: #f5a524; --danger: #c93b3b; --live: #1f9d55; --studio: #7c3aed; }
@media (prefers-color-scheme: dark) { :root { --bg: #161615; --panel: #1f1f1d; --line: #33332f; --text: #ededea; --muted: #9a9a94; --accent: #5b8cff; --accent-text: #0b0b0a; --pin: #f5b84a; --danger: #ef6b6b; --live: #3ccf7a; --studio: #9b6bff; } }
* { box-sizing: border-box; }
body { margin: 0; font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif; background: var(--bg); color: var(--text); }
header { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 16px; background: var(--panel); border-bottom: 1px solid var(--line); }
header h1 { margin: 0; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge { padding: 2px 8px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); font-size: 12px; white-space: nowrap; }
.spacer { flex: 1; }
main { display: grid; grid-template-columns: minmax(0, 1fr) 300px; min-height: calc(100vh - 48px); }
.frames { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 32px; }
figure { margin: 0; }
figcaption { margin-bottom: 8px; color: var(--muted); font-size: 12px; }
.shot { position: relative; cursor: crosshair; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; background: var(--panel); }
.shot img { display: block; width: 100%; height: auto; user-select: none; -webkit-user-drag: none; }
.pin { position: absolute; transform: translate(-50%, -100%); min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px 11px 11px 2px; background: var(--pin); color: #1d1d1b; font-size: 11px; font-weight: 600; display: grid; place-items: center; pointer-events: none; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
aside { border-left: 1px solid var(--line); background: var(--panel); padding: 16px; display: flex; flex-direction: column; gap: 12px; position: sticky; top: 48px; height: calc(100vh - 48px); overflow: auto; }
aside h2 { margin: 0; font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
.hint { margin: 0; color: var(--muted); }
form { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
input, textarea { font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; }
textarea { min-height: 72px; resize: vertical; }
input:focus-visible, textarea:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.row { display: flex; gap: 8px; justify-content: flex-end; }
button { font: inherit; height: 28px; padding: 0 12px; border-radius: 6px; border: 1px solid var(--line); background: var(--panel); color: var(--text); cursor: pointer; }
button.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-text); font-weight: 600; }
button:disabled { opacity: .5; cursor: default; }
.error { color: var(--danger); margin: 0; font-size: 12px; }
ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
li { padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; }
li .who { font-weight: 600; }
li .where { color: var(--muted); font-size: 12px; }
li p { margin: 4px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.badge.live { color: var(--text); display: inline-flex; align-items: center; gap: 6px; }
.badge.live::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--live); }
.badge.live.off::before { background: var(--muted); }
.ended { grid-column: 1 / -1; margin: 64px auto; max-width: 360px; text-align: center; color: var(--muted); }
.cursor { position: absolute; z-index: 2; pointer-events: none; transform: translate(-2px, -2px); transition: left 80ms linear, top 80ms linear; }
.cursor svg { display: block; width: 16px; height: 16px; filter: drop-shadow(0 1px 1px rgba(0,0,0,.3)); }
.cursor span { position: absolute; left: 14px; top: 14px; padding: 1px 6px; border-radius: 4px; background: var(--studio); color: #fff; font-size: 11px; font-weight: 600; white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .cursor { transition: none; } }
@media (max-width: 760px) { main { grid-template-columns: 1fr; } aside { position: static; height: auto; border-left: 0; border-top: 1px solid var(--line); } }
`;

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
      where.textContent = data.frames[spot.frame].name + ' at ' + x + ', ' + y;
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

function frameFigure(base: string, frame: ShareFrame, index: number): string {
  const label = `${escapeHtml(frame.name)}${frame.path ? ` · /${escapeHtml(frame.path)}` : ''} · ${frame.width} × ${frame.height}`;
  return `<figure><figcaption>${label}</figcaption><div class="shot" data-i="${index}" data-w="${frame.width}" data-h="${frame.cssHeight}"><img src="${base}/f/${index}" alt="${escapeHtml(frame.name)} frame" width="${frame.width}" height="${frame.cssHeight}"></div></figure>`;
}

export function viewerHtml(data: ViewerData, nonce: string): string {
  const expires = new Date(data.expiresAt).toUTCString();
  const widths = data.frames.map((f, i) => `figure:nth-of-type(${i + 1}) { width: min(100%, ${f.width}px); }`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(data.title)} · Shared from Design Studio</title>
<style nonce="${nonce}">${STYLE}\n${widths}</style>
</head>
<body data-rev="${data.rev ?? 0}">
<header><h1>${escapeHtml(data.title)}</h1><span class="badge">Read only</span>${data.live ? '<span class="badge live off" id="live-badge" role="status">Connecting</span>' : ''}<span class="spacer"></span><span class="badge">Link ends ${escapeHtml(expires)}</span></header>
<main>
<section class="frames" aria-label="Frames">${data.frames.map((frame, index) => frameFigure(data.base, frame, index)).join('')}</section>
<aside aria-label="Comments">
<h2>Comments</h2>
<form id="comment-form" novalidate>
<p class="hint" id="comment-where">Click a frame to pin your comment, or send it without a spot.</p>
<label>Your name<input id="viewer-name" autocomplete="name" maxlength="${SHARE_NAME_MAX}" required></label>
<label>Comment<textarea id="viewer-text" maxlength="${SHARE_COMMENT_MAX}" required></textarea></label>
<p class="error" id="comment-error" role="alert"></p>
<div class="row"><button type="submit" class="primary" id="comment-send">Send comment</button></div>
</form>
<p class="hint" id="comment-empty">No comments from this link yet.</p>
<ol id="comment-list"></ol>
</aside>
</main>
<script type="application/json" id="share-data">${jsonForScript({ frames: data.frames })}</script>
<script nonce="${nonce}">${SCRIPT}</script>
${data.live ? `<script nonce="${nonce}">${LIVE_SCRIPT}</script>` : ''}
</body>
</html>`;
}

const GONE_STYLE = `:root { color-scheme: light dark; --bg: #f7f7f5; --fg: #1b1b1a; --muted: #6b6b66; --line: #e2e2de; }
@media (prefers-color-scheme: dark) { :root { --bg: #161615; --fg: #ededea; --muted: #9a9a94; --line: #2c2c2a; } }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--fg); font: 14px/1.5 system-ui, -apple-system, sans-serif; }
main { max-width: 360px; padding: 24px; border: 1px solid var(--line); border-radius: 12px; text-align: center; }
h1 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
p { margin: 0; color: var(--muted); }`;

export function goneHtml(reason: 'revoked' | 'expired', nonce: string): string {
  const title = reason === 'revoked' ? 'This link was turned off' : 'This link has ended';
  const body = reason === 'revoked' ? 'The person who shared it turned it off. Ask them for a new link.' : 'Its time ran out. Ask the person who shared it for a new link.';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>${title} · Design Studio</title>
<style nonce="${nonce}">${GONE_STYLE}</style>
</head>
<body><main><h1>${title}</h1><p>${body}</p></main></body>
</html>`;
}

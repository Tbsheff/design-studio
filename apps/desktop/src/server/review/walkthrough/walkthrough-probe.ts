import { SOURCE_LOC_ATTR } from "@design-studio/contracts";

const MAX_LISTED = 60;

const PROBE_SOURCE = String.raw`(() => {
  const LOC = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const MAX = ${MAX_LISTED};
  const ROLES = { a: 'link', button: 'button', select: 'combobox', textarea: 'textbox', summary: 'button' };
  const INPUT_ROLES = { checkbox: 'checkbox', radio: 'radio', range: 'slider', button: 'button', submit: 'button', reset: 'button', search: 'searchbox' };
  const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [role=button], [role=link], [contenteditable=""], [contenteditable="true"]';
  const clean = (text) => (text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const pathOf = (el) => {
    const parts = [];
    for (let node = el; node && node.nodeType === 1 && node !== document.documentElement; node = node.parentElement) {
      if (node.id && /^[A-Za-z][\w-]*$/.test(node.id) && document.querySelectorAll('#' + node.id).length === 1) { parts.unshift('#' + node.id); break; }
      const tag = node.tagName.toLowerCase();
      const same = node.parentElement ? [...node.parentElement.children].filter((c) => c.tagName === node.tagName) : [];
      parts.unshift(same.length > 1 ? tag + ':nth-of-type(' + (same.indexOf(node) + 1) + ')' : tag);
    }
    return parts.join(' > ');
  };
  const roleOf = (el) => {
    const own = el.getAttribute('role');
    if (own) return own.trim().split(/\s+/)[0];
    const tag = el.tagName.toLowerCase();
    if (tag === 'input') return INPUT_ROLES[(el.getAttribute('type') || 'text').toLowerCase()] || 'textbox';
    return ROLES[tag] || 'generic';
  };
  const nameOf = (el) => {
    const ids = el.getAttribute('aria-labelledby');
    if (ids) { const text = clean(ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ')); if (text) return text; }
    const aria = clean(el.getAttribute('aria-label'));
    if (aria) return aria;
    if (el.labels && el.labels.length > 0) { const label = clean([...el.labels].map((l) => l.textContent).join(' ')); if (label) return label; }
    const isField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
    if (!isField) {
      const text = clean(el.innerText || el.textContent);
      if (text) return text;
      const alts = clean([...el.querySelectorAll('img[alt], [aria-label]')].map((c) => c.getAttribute('alt') || c.getAttribute('aria-label')).join(' '));
      if (alts) return alts;
    }
    const title = clean(el.getAttribute('title'));
    if (title) return title;
    const holder = clean(el.getAttribute('placeholder'));
    if (holder) return holder;
    if (el.tagName === 'INPUT' && ['submit', 'reset', 'button'].includes(el.type) && el.value) return clean(el.value);
    return '';
  };
  const isVisible = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0;
  };
  const found = [...document.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && !el.closest('[inert]') && el.getAttribute('aria-hidden') !== 'true' && !(el.tagName === 'INPUT' && el.type === 'hidden') && isVisible(el));
  const listed = found.slice(0, MAX).map((el, id) => {
    const rect = el.getBoundingClientRect();
    const isField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && !['checkbox', 'radio', 'button', 'submit', 'reset', 'image'].includes((el.getAttribute('type') || '').toLowerCase());
    const href = el.tagName === 'A' && el.getAttribute('href') ? el.href : null;
    const name = nameOf(el);
    return {
      id,
      role: roleOf(el),
      name,
      hasName: name.length > 0,
      isField,
      isInView: rect.bottom > 0 && rect.top < window.innerHeight,
      href,
      layerId: el.getAttribute(LOC),
      selector: pathOf(el),
      box: { left: rect.left + window.scrollX, top: rect.top + window.scrollY, width: rect.width, height: rect.height },
    };
  });
  return { elements: listed, clip: { x: window.scrollX, y: window.scrollY, width: window.innerWidth, height: window.innerHeight }, url: location.href };
})()`;

const GUARD_SOURCE = String.raw`(() => {
  if (window.__dsWalkGuard) return window.__dsWalkGuard.blocked;
  const guard = { blocked: 0 };
  window.__dsWalkGuard = guard;
  const isRead = (method) => ['GET', 'HEAD', 'OPTIONS'].includes(String(method || 'GET').toUpperCase());
  const nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    const method = (init && init.method) || (input && input.method) || 'GET';
    if (!isRead(method)) { guard.blocked += 1; return Promise.reject(new TypeError('Blocked by walkthrough: read-only')); }
    return nativeFetch.apply(this, arguments);
  };
  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method) { this.__dsMethod = method; return nativeOpen.apply(this, arguments); };
  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (!isRead(this.__dsMethod)) { guard.blocked += 1; this.abort(); return undefined; }
    return nativeSend.apply(this, arguments);
  };
  const nativeSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () {
    if (!isRead(this.method)) { guard.blocked += 1; return undefined; }
    return nativeSubmit.call(this);
  };
  document.addEventListener('submit', (event) => {
    const method = (event.submitter && event.submitter.getAttribute('formmethod')) || event.target.method;
    if (!isRead(method)) { guard.blocked += 1; event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  navigator.sendBeacon = () => { guard.blocked += 1; return false; };
  return guard.blocked;
})()`;

const READ_BLOCKED_SOURCE =
  "(window.__dsWalkGuard ? window.__dsWalkGuard.blocked : 0)";

export { GUARD_SOURCE, PROBE_SOURCE, READ_BLOCKED_SOURCE };

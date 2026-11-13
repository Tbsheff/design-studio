const HOOK = `(() => {
  if (window.__studioWarm) return true;
  const clock = { rebuildAt: 0, doneAt: 0, mutationAt: 0, bodyAt: 0, taint: 0, paused: false, saving: false, saved: new Map() };
  window.__studioWarm = clock;
  for (const level of ['log', 'info', 'debug']) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('[Fast Refresh] rebuilding')) clock.rebuildAt = Date.now();
      if (typeof args[0] === 'string' && args[0].includes('[Fast Refresh] done')) clock.doneAt = Date.now();
      if (args[0] === '[vite]' && typeof args[1] === 'string' && args[1].startsWith('hot updated:')) clock.rebuildAt = clock.doneAt = Date.now();
      if (typeof args[0] === 'string' && args[0].startsWith('[vite] css hot updated:')) clock.rebuildAt = clock.doneAt = Date.now();
      original(...args);
    };
  }
  const devChrome = (node) => { const el = node && node.nodeType === 1 ? node : node && node.parentElement; return Boolean(el && el.closest && el.closest('nextjs-portal')); };
  const sheetOnly = (record) => record.type === 'childList' && record.target === document.head && record.removedNodes.length === 0 && [...record.addedNodes].every((node) => node.nodeName === 'STYLE');
  const keep = (record) => {
    if (clock.paused || sheetOnly(record)) return;
    if (clock.saving && record.type === 'attributes' && record.attributeName === 'style') {
      if (!clock.saved.has(record.target)) clock.saved.set(record.target, record.oldValue);
      return;
    }
    clock.taint += 1;
  };
  new MutationObserver((records) => {
    const real = records.filter((record) => !devChrome(record.target));
    if (real.length) clock.mutationAt = Date.now();
    if (real.some((record) => !document.head.contains(record.target))) clock.bodyAt = Date.now();
    real.forEach(keep);
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeOldValue: true, characterData: true });
  return true;
})()`;

const CLOCK = `(() => { const c = window.__studioWarm; return { hooked: Boolean(c), rebuildAt: c ? c.rebuildAt : 0, doneAt: c ? c.doneAt : 0, mutationAt: c ? c.mutationAt : 0, bodyAt: c ? c.bodyAt : 0, taint: c ? c.taint : 0, now: Date.now() }; })()`;

const SAVE = `(() => { const c = window.__studioWarm; if (!c) return -1; window.scrollTo(0, 0); c.saved = new Map(); c.saving = true; return c.taint; })()`;

const ROLLBACK = `new Promise((done) => {
  const c = window.__studioWarm;
  if (!c) return done(-1);
  c.saving = false;
  c.paused = true;
  for (const [el, old] of c.saved) { if (old === null) el.removeAttribute('style'); else el.setAttribute('style', old); }
  c.saved = new Map();
  window.scrollTo(0, 0);
  requestAnimationFrame(() => requestAnimationFrame(() => { c.paused = false; done(c.taint); }));
})`;

const PAUSE = `(() => { if (window.__studioWarm) window.__studioWarm.paused = true; return true; })()`;

const RESUME = `new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => { if (window.__studioWarm) window.__studioWarm.paused = false; done(true); })))`;

const HOT = `Boolean(window.next || window.__NEXT_DATA__ || self.__next_f || document.querySelector('script[src*="/@vite/client"]'))`;

export { HOOK, CLOCK, SAVE, ROLLBACK, PAUSE, RESUME, HOT };

const RUNTIME = String.raw`(async () => {
  const entry = __ENTRY__;
  const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    const res = await fetch(entry, { credentials: 'include', headers: { accept: 'text/html' } });
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    for (const node of doc.querySelectorAll('link[rel="stylesheet"], head style')) document.head.appendChild(node.cloneNode(true));
    document.documentElement.className = doc.documentElement.className;
    const style = doc.documentElement.getAttribute('style');
    if (style) document.documentElement.setAttribute('style', style);
    document.body.className = doc.body.className;
  } catch (error) {}
  await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.sheet ? true : new Promise((resolve) => { link.onload = link.onerror = resolve; setTimeout(resolve, 8000); })));
  await frames();
  await new Promise((resolve) => setTimeout(resolve, 200));
  const swap = (text) => text
    .replace(/:hover(?![-\w])/g, '[data-gallery-force~="hover"]')
    .replace(/:focus-visible(?![-\w])/g, '[data-gallery-force~="focus"]')
    .replace(/:focus(?![-\w])/g, '[data-gallery-force~="focus"]')
    .replace(/:disabled(?![-\w])/g, '[data-gallery-force~="disabled"]');
  const clone = (rule) => {
    if (rule.type === 1) {
      const next = swap(rule.cssText);
      return next === rule.cssText ? null : next;
    }
    if (rule.cssRules && rule.cssRules.length > 0) {
      const inner = [...rule.cssRules].map(clone).filter(Boolean);
      if (inner.length === 0) return null;
      const text = rule.cssText;
      return text.slice(0, text.indexOf('{')) + '{' + inner.join('\n') + '}';
    }
    return null;
  };
  const out = [];
  for (const sheet of document.styleSheets) {
    try { for (const rule of sheet.cssRules) { const text = clone(rule); if (text) out.push(text); } } catch (error) {}
  }
  const tag = document.createElement('style');
  tag.id = 'gallery-force';
  tag.textContent = out.join('\n');
  document.head.appendChild(tag);
  for (const cell of document.querySelectorAll('.g-cell[data-state]')) {
    const state = cell.getAttribute('data-state');
    if (state === 'default') continue;
    const host = cell.firstElementChild;
    const target = host && host.firstElementChild;
    if (!target) continue;
    if (state === 'disabled') { target.setAttribute('disabled', ''); target.setAttribute('aria-disabled', 'true'); }
    target.setAttribute('data-gallery-force', state);
  }
  await frames();
  window.__galleryReady = true;
})();`;

export { RUNTIME };

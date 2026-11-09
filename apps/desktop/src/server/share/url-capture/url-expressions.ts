const MAX_TEXT_CHARS = 200_000;

const READY_EXPRESSION = `(async () => {
  try { await document.fonts.ready; } catch (error) {}
  await Promise.all([...document.images].filter((img) => !img.complete).map((img) => new Promise((done) => { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); setTimeout(done, 3000); })));
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  return true;
})()`;

const META_EXPRESSION = `(() => {
  const entry = performance.getEntriesByType('navigation')[0];
  const root = document.documentElement;
  return {
    height: Math.ceil(Math.max(root.scrollHeight, document.body ? document.body.scrollHeight : 0)),
    href: location.href,
    status: entry && typeof entry.responseStatus === 'number' ? entry.responseStatus : 0,
    title: document.title || '',
  };
})()`;

const TEXT_EXPRESSION = `(() => {
  const skipped = new Set(['script', 'style', 'noscript', 'template', 'iframe', 'canvas', 'svg']);
  const lines = [];
  let total = 0;
  const clean = (value) => value.replace(/\\s+/g, ' ').trim();
  const isShown = (el) => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };
  const push = (line) => {
    if (!line || total > ${MAX_TEXT_CHARS}) return;
    lines.push(line);
    total += line.length;
  };
  const isInline = (el) => getComputedStyle(el).display.startsWith('inline');
  const walk = (el) => {
    if (skipped.has(el.localName) || !isShown(el)) return;
    const heading = /^h([1-6])$/.exec(el.localName);
    if (heading) {
      const text = clean(el.innerText || '');
      if (text) push('#'.repeat(Number(heading[1])) + ' ' + text);
      return;
    }
    const children = [...el.children];
    if (children.every(isInline)) {
      const text = clean(el.innerText || '');
      if (text) push(el.localName === 'li' ? '- ' + text : text);
      return;
    }
    for (const node of el.childNodes) {
      if (node.nodeType === 3) push(clean(node.textContent || ''));
      else if (node.nodeType === 1) walk(node);
    }
  };
  if (document.body) walk(document.body);
  const source = new URL(location.href);
  for (const key of [...source.searchParams.keys()]) if (key.startsWith('__studio')) source.searchParams.delete(key);
  return '# ' + (document.title || location.hostname) + '\\n\\nSource: ' + source.href + '\\n\\n' + lines.join('\\n\\n') + '\\n';
})()`;

const STYLE_EXPRESSION = `(() => {
  const colors = new Map();
  const fonts = new Map();
  const radii = new Map();
  const hex = (value) => {
    const match = /^rgba?\\(([^)]+)\\)$/.exec(value);
    if (!match) return null;
    const parts = match[1].split(/[ ,\\/]+/).filter(Boolean).map(Number);
    if (parts.length >= 4 && parts[3] === 0) return null;
    const pair = (n) => Math.round(n).toString(16).padStart(2, '0');
    return '#' + pair(parts[0]) + pair(parts[1]) + pair(parts[2]);
  };
  const add = (map, key, amount) => map.set(key, (map.get(key) || 0) + amount);
  const top = (map, count) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, count);
  const all = [document.documentElement, document.body, ...document.body.querySelectorAll('*')].slice(0, 6000);
  for (const el of all) {
    if (!el) continue;
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (box.width < 1 || box.height < 1 || style.display === 'none' || style.visibility === 'hidden') continue;
    const area = Math.min(box.width, window.innerWidth) * box.height;
    const background = hex(style.backgroundColor);
    if (background) add(colors, background, area);
    const own = [...el.childNodes].filter((node) => node.nodeType === 3 && (node.textContent || '').trim());
    if (own.length > 0) {
      const text = hex(style.color);
      if (text) add(colors, text, area);
      const family = (style.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim();
      if (family) add(fonts, family, own.reduce((sum, node) => sum + (node.textContent || '').length, 0));
    }
    const radius = style.borderTopLeftRadius;
    if (radius && radius !== '0px') add(radii, radius, 1);
  }
  return {
    baseFontSize: parseFloat(getComputedStyle(document.body).fontSize) || 16,
    colors: top(colors, 12).map(([value, area]) => ({ area: Math.round(area), hex: value })),
    fontFamilies: top(fonts, 6).map(([family]) => family),
    radii: top(radii, 8).map(([radius]) => radius),
  };
})()`;

export {
  MAX_TEXT_CHARS,
  META_EXPRESSION,
  READY_EXPRESSION,
  STYLE_EXPRESSION,
  TEXT_EXPRESSION,
};

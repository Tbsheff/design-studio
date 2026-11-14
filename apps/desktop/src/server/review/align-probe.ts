const ALIGN_PROBE_SOURCE = String.raw`(cap) => {
  const start = performance.now();
  const SKIP = new Set(['script', 'style', 'noscript', 'template', 'head', 'title', 'meta', 'link', 'svg', 'path', 'br', 'option', 'wbr']);
  const NOUN_TAGS = { label: 'label', li: 'item', button: 'button', img: 'image', input: 'field', textarea: 'field', select: 'field', a: 'link', section: 'section', article: 'card', p: 'paragraph' };
  const NOUN_CLASS = /(card|tile|item|chip|badge|button|label|field|row|cell|avatar|tab)/i;
  const nth = (el) => {
    const parent = el.parentElement;
    if (!parent) return el.tagName.toLowerCase();
    const same = [...parent.children].filter((c) => c.tagName === el.tagName);
    const tag = el.tagName.toLowerCase();
    return same.length > 1 ? tag + ':nth-of-type(' + (same.indexOf(el) + 1) + ')' : tag;
  };
  const selectorOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node !== document.body && node !== document.documentElement) {
      if (node.id && document.querySelectorAll('#' + CSS.escape(node.id)).length === 1) {
        parts.unshift('#' + CSS.escape(node.id));
        return parts.join(' > ');
      }
      parts.unshift(nth(node));
      node = node.parentElement;
    }
    parts.unshift('body');
    return parts.join(' > ');
  };
  const nounOf = (el) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    const match = NOUN_CLASS.exec(cls);
    if (match) return match[1].toLowerCase();
    return NOUN_TAGS[el.tagName.toLowerCase()] || 'element';
  };
  const num = (value) => parseFloat(value) || 0;
  const isShown = (el, cs, r) => r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && !el.closest('[aria-hidden="true"]');
  const childOf = (el) => {
    const tag = el.tagName.toLowerCase();
    if (SKIP.has(tag)) return null;
    const cs = getComputedStyle(el);
    if (cs.position === 'absolute' || cs.position === 'fixed') return null;
    if (cs.transform !== 'none' || cs.display === 'inline' || cs.display === 'contents' || cs.display === 'none') return null;
    const r = el.getBoundingClientRect();
    if (!isShown(el, cs, r) || r.width < 8 || r.height < 8) return null;
    return {
      selector: selectorOf(el),
      tag,
      noun: nounOf(el),
      x: r.left + window.scrollX,
      y: r.top + window.scrollY,
      width: r.width,
      height: r.height,
      alignSelf: cs.alignSelf,
      margin: [num(cs.marginTop), num(cs.marginRight), num(cs.marginBottom), num(cs.marginLeft)],
    };
  };
  const groups = [];
  let used = 0;
  const all = [document.body, ...document.body.querySelectorAll('*')].slice(0, 5000);
  for (const el of all) {
    if (used >= cap) break;
    if (el.children.length < 2 || SKIP.has(el.tagName.toLowerCase()) || el.closest('svg')) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (!isShown(el, cs, r)) continue;
    const children = [];
    for (const child of el.children) {
      const box = childOf(child);
      if (box) children.push(box);
      if (children.length > 24) break;
    }
    if (children.length < 2 || children.length > 24 || used + children.length > cap) continue;
    used += children.length;
    groups.push({
      selector: selectorOf(el),
      tag: el.tagName.toLowerCase(),
      display: cs.display,
      direction: cs.flexDirection,
      alignItems: cs.alignItems,
      children,
    });
  }
  return { groups, ms: Math.round((performance.now() - start) * 10) / 10 };
}`;

const toAlignProbeExpression = (cap: number): string =>
  `(${ALIGN_PROBE_SOURCE})(${JSON.stringify(cap)})`;

export { toAlignProbeExpression };

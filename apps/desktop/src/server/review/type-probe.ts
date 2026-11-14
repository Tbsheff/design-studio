const TYPE_PROBE_SOURCE = String.raw`(cap) => {
  const SKIP = new Set(['script', 'style', 'noscript', 'template', 'head', 'title', 'meta', 'link', 'svg', 'path', 'br', 'option']);
  const LABEL_TAGS = new Set(['label', 'button', 'small', 'figcaption', 'caption', 'sup', 'sub', 'kbd', 'code', 'th', 'legend', 'time', 'abbr', 'select', 'option', 'input']);
  const LABEL_CLASS = /badge|label|caption|chip|tag|pill|eyebrow|kicker|meta|overline|hint|legal|footnote/i;
  const BLOCK_TAGS = new Set(['p', 'li', 'blockquote', 'dd', 'figcaption', 'td']);
  const UA_MARGIN = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'dl', 'dd', 'blockquote', 'figure', 'body', 'hr', 'menu', 'pre', 'fieldset', 'form']);
  const SPACE_PROPS = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'gap', 'row-gap', 'column-gap', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left'];
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
  const shown = (el, cs, r) => r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && !el.closest('[aria-hidden="true"]');
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
  const lineCount = (el, size) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = [];
    for (const rect of range.getClientRects()) {
      if (rect.width < 1 || rect.height < 1) continue;
      if (!tops.some((top) => Math.abs(top - rect.top) < size * 0.5)) tops.push(rect.top);
    }
    range.detach();
    return Math.max(1, tops.length);
  };
  const familyOf = (value) => (value.split(',')[0] || '').trim().replace(/^['"]|['"]$/g, '').trim().toLowerCase();
  const levelOf = (el) => {
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) return Number(tag.slice(1));
    if (el.getAttribute('role') === 'heading') return Number(el.getAttribute('aria-level')) || 2;
    return 0;
  };
  const labelLike = (el, cs, text) => {
    const tag = el.tagName.toLowerCase();
    if (LABEL_TAGS.has(tag) || el.closest('button, label, a[role="button"], [role="tab"], nav, footer')) return true;
    const cls = typeof el.className === 'string' ? el.className : '';
    if (LABEL_CLASS.test(cls)) return true;
    if (cs.textTransform === 'uppercase') return true;
    return text.length <= 24 && cs.display !== 'block' && cs.display !== 'list-item';
  };
  const texts = [];
  const owners = new Map();
  const boxes = [];
  const all = [...document.body.querySelectorAll('*')].slice(0, 5000);
  for (const el of all) {
    const tag = el.tagName.toLowerCase();
    if (SKIP.has(tag) || el.closest('svg')) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (!shown(el, cs, r)) continue;
    if (boxes.length < cap) {
      const spaces = [];
      for (const prop of SPACE_PROPS) {
        if (prop.startsWith('margin') && UA_MARGIN.has(tag)) continue;
        if (prop.endsWith('gap') && !/flex|grid/.test(cs.display)) continue;
        if (prop !== 'gap' && prop.endsWith('gap') && spaces.some((space) => space.prop === 'gap')) continue;
        const raw = cs.getPropertyValue(prop);
        if (!/^-?\d*\.?\d+px$/.test(raw)) continue;
        const px = Math.abs(parseFloat(raw));
        if (px >= 4) spaces.push({ prop, px: Math.round(px * 100) / 100 });
      }
      if (spaces.length > 0) boxes.push({ selector: selectorOf(el), spaces });
    }
    if (texts.length >= cap) continue;
    const text = ownText(el);
    if (text.length < 2) continue;
    const size = parseFloat(cs.fontSize) || 0;
    if (size <= 0) continue;
    const parent = el.parentElement && owners.get(el.parentElement);
    if (parent && cs.display.startsWith('inline') && Math.abs(parent.size - size) < 0.5) continue;
    const whole = (el.innerText || '').replace(/\s+/g, ' ').trim();
    const lines = lineCount(el, size);
    const lineHeight = cs.lineHeight === 'normal' ? size * 1.2 : parseFloat(cs.lineHeight) || size * 1.2;
    const level = levelOf(el);
    const entry = {
      selector: selectorOf(el),
      tag,
      text: whole.slice(0, 60),
      size: Math.round(size * 100) / 100,
      lineHeight: Math.round(lineHeight * 100) / 100,
      family: familyOf(cs.fontFamily),
      lines,
      chars: Math.round(whole.length / lines),
      level,
      isHeading: level > 0,
      isLabel: level === 0 && labelLike(el, cs, whole),
      isBlock: level === 0 && (BLOCK_TAGS.has(tag) || cs.display === 'block' || cs.display === 'list-item') && whole.length >= 40,
    };
    owners.set(el, entry);
    texts.push(entry);
  }
  const rootStyle = getComputedStyle(document.documentElement);
  const isTailwind = rootStyle.getPropertyValue('--spacing').trim() !== '' || rootStyle.getPropertyValue('--tw-ring-inset') !== '' || [...document.styleSheets].some((sheet) => { try { return [...sheet.cssRules].slice(0, 200).some((rule) => rule.cssText.includes('--tw-')); } catch { return false; } });
  return { texts, boxes, isTailwind };
}`;

const toTypeProbeExpression = (cap: number): string =>
  `(${TYPE_PROBE_SOURCE})(${JSON.stringify(cap)})`;

export { toTypeProbeExpression };

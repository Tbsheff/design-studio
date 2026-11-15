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
  const wordsOf = (el) => {
    const out = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const value = node.textContent || '';
      for (const match of value.matchAll(/\S+/g)) out.push({ node, start: match.index, end: match.index + match[0].length, word: match[0] });
    }
    return out;
  };
  const topOf = (word) => {
    const range = document.createRange();
    range.setStart(word.node, word.start);
    range.setEnd(word.node, word.end);
    const rect = range.getClientRects()[0];
    range.detach();
    return rect ? { top: rect.top, width: rect.width } : null;
  };
  const lastLineOf = (el, size) => {
    const words = wordsOf(el);
    const last = words.length > 0 ? topOf(words[words.length - 1]) : null;
    if (!last) return { count: 0, word: '', extraPx: 0 };
    let count = 0;
    for (let index = words.length - 1; index >= 0 && count < 8; index -= 1) {
      const box = topOf(words[index]);
      if (!box || Math.abs(box.top - last.top) >= size * 0.5) break;
      count += 1;
    }
    const firstTop = topOf(words[0]);
    let extraPx = 0;
    for (const word of words.slice(0, 40)) {
      const box = topOf(word);
      if (box && firstTop && Math.abs(box.top - firstTop.top) >= size * 0.5) extraPx += box.width + size * 0.3;
    }
    return { count, word: words[words.length - 1].word.replace(/[.,;:!?]+$/, '').slice(0, 30), extraPx: Math.round(extraPx) };
  };
  const roomOf = (el) => {
    const box = el.closest('button, a, label, [role="button"]') || el;
    const parent = box.parentElement;
    if (!parent) return 0;
    const ps = getComputedStyle(parent);
    if (!/flex/.test(ps.display) || ps.flexDirection.startsWith('column') || ps.flexWrap === 'wrap') return 0;
    const inner = parent.clientWidth - (parseFloat(ps.paddingLeft) || 0) - (parseFloat(ps.paddingRight) || 0);
    const kids = [...parent.children].filter((kid) => getComputedStyle(kid).position !== 'absolute');
    const used = kids.reduce((sum, kid) => sum + kid.getBoundingClientRect().width, 0) + (parseFloat(ps.columnGap) || 0) * Math.max(0, kids.length - 1);
    return Math.max(0, Math.round(inner - used));
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
    const isLabel = level === 0 && labelLike(el, cs, whole);
    const wrap = lines >= 2 ? lastLineOf(el, size) : { count: 0, word: '', extraPx: 0 };
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
      isLabel,
      lastLineWords: wrap.count,
      lastWord: wrap.word,
      extraPx: wrap.extraPx,
      roomPx: isLabel && lines >= 2 ? roomOf(el) : 0,
      textWrap: cs.textWrapStyle || cs.textWrap || '',
      whiteSpace: cs.textWrapMode === 'nowrap' ? 'nowrap' : cs.whiteSpace,
      words: whole.split(' ').filter(Boolean).length,
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

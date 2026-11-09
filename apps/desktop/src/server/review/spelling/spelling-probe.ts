interface RawSpellingText {
  readonly selector: string;
  readonly text: string;
}

interface RawSpellingProbe {
  readonly isTruncated: boolean;
  readonly texts: readonly RawSpellingText[];
}

const TEXTS_MAX = 3000;

const PROBE_SOURCE = String.raw`(() => {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'KBD', 'SAMP', 'TEXTAREA', 'SVG', 'TEMPLATE', 'TITLE']);
  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const pathOf = (el) => {
    const parts = [];
    for (let node = el; node && node.nodeType === 1 && node !== document.documentElement; node = node.parentElement) {
      if (node.id && /^[A-Za-z][\w-]*$/.test(node.id)) { parts.unshift('#' + node.id); break; }
      const tag = node.tagName.toLowerCase();
      const same = node.parentElement ? [...node.parentElement.children].filter((c) => c.tagName === node.tagName) : [];
      parts.unshift(same.length > 1 ? tag + ':nth-of-type(' + (same.indexOf(node) + 1) + ')' : tag);
    }
    return parts.join(' > ');
  };
  const texts = [];
  let isTruncated = false;
  for (const el of document.body.querySelectorAll('*')) {
    if (SKIP.has(el.tagName.toUpperCase()) || el.closest('code, pre, svg, [contenteditable], [data-studio-chrome]')) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
    if (!own || !visible(el)) continue;
    if (texts.length >= ${TEXTS_MAX}) { isTruncated = true; break; }
    texts.push({ selector: pathOf(el), text: own.slice(0, 2000) });
  }
  return { isTruncated, texts };
})()`;

export { PROBE_SOURCE as spellingProbe };

export type { RawSpellingProbe, RawSpellingText };

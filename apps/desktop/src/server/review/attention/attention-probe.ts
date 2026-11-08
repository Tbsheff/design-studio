interface RawAttentionElement {
  readonly background: string | null;
  readonly backdrop: string | null;
  readonly box: {
    readonly height: number;
    readonly width: number;
    readonly x: number;
    readonly y: number;
  };
  readonly color: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly isInteractive: boolean;
  readonly isPrimaryCandidate: boolean;
  readonly label: string;
  readonly path: string;
  readonly role: string;
  readonly textLength: number;
}

interface RawAttentionProbe {
  readonly elements: readonly RawAttentionElement[];
  readonly isScopeMissing: boolean;
  readonly scopeBox: RawAttentionElement["box"] | null;
}

interface AttentionProbeInput {
  readonly max: number;
  readonly scope: string | null;
}

const PROBE_SOURCE = String.raw`(input) => {
  const SKIP = new Set(['script', 'style', 'noscript', 'template', 'head', 'meta', 'link', 'br', 'hr', 'title', 'path', 'defs', 'source']);
  const MEDIA = new Set(['img', 'svg', 'canvas', 'video', 'picture', 'iframe']);
  const INTERACTIVE = 'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"]';
  const ROLES = { a: 'link', button: 'button', select: 'combobox', textarea: 'textbox', img: 'img', nav: 'navigation', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading', summary: 'button' };
  const INPUT_ROLES = { checkbox: 'checkbox', radio: 'radio', range: 'slider', button: 'button', submit: 'button', reset: 'button' };
  let scopeEl = null;
  if (input.scope) {
    try { scopeEl = document.querySelector(input.scope); } catch { scopeEl = null; }
    if (!scopeEl) return { elements: [], isScopeMissing: true, scopeBox: null };
  }
  const root = scopeEl || document.body;
  const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();
  const boxOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height }; };
  const pathOf = (el) => {
    const parts = [];
    for (let node = el; node && node.parentElement && node !== document.body; node = node.parentElement) parts.unshift(node.tagName.toLowerCase() + ':nth-child(' + ([...node.parentElement.children].indexOf(node) + 1) + ')');
    return ['body', ...parts].join(' > ');
  };
  const opaque = (value) => { const m = /rgba?\(([^)]+)\)/.exec(value); if (!m) return !!value && value !== 'transparent' && !/\/\s*0(\.0+)?\s*\)$/.test(value); const parts = m[1].split(/[\s,\/]+/).filter(Boolean); return parts.length < 4 || Number(parts[3]) >= 0.5; };
  const backdropOf = (el) => {
    for (let node = el.parentElement; node; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (opaque(cs.backgroundColor)) return cs.backgroundColor;
    }
    return null;
  };
  const roleOf = (el, tag) => {
    const own = el.getAttribute('role');
    if (own) return own.trim().split(/\s+/)[0];
    if (tag === 'input') return INPUT_ROLES[(el.getAttribute('type') || 'text').toLowerCase()] || 'textbox';
    return ROLES[tag] || 'generic';
  };
  const ownText = (el) => clean([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' '));
  const nameOf = (el, tag) => clean(el.getAttribute('aria-label')) || clean(el.innerText || el.textContent) || clean(el.getAttribute('alt')) || clean(el.getAttribute('title')) || (tag === 'input' ? clean(el.value || el.getAttribute('placeholder')) : '');
  const viewArea = window.innerWidth * window.innerHeight;
  const elements = [];
  const walk = (el) => {
    if (elements.length >= input.max) return;
    const tag = el.tagName.toLowerCase();
    if (SKIP.has(tag)) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return;
    const box = boxOf(el);
    const isVisible = box.width >= 1 && box.height >= 1;
    const isInteractive = el.matches(INTERACTIVE) && !el.disabled && el.getAttribute('aria-hidden') !== 'true';
    const isMedia = MEDIA.has(tag);
    if (isVisible) {
      const text = isInteractive || isMedia ? clean(isInteractive ? el.innerText || el.textContent : '') : ownText(el);
      const fill = opaque(cs.backgroundColor) ? cs.backgroundColor : null;
      const isSmallFill = fill !== null && box.width * box.height < viewArea * 0.02;
      if (isInteractive || isMedia || text.length > 0 || isSmallFill) {
        const role = roleOf(el, tag);
        const inputType = (el.getAttribute('type') || '').toLowerCase();
        const isButton = tag === 'button' || role === 'button' || (tag === 'input' && ['submit', 'button'].includes(inputType));
        elements.push({
          background: fill,
          backdrop: backdropOf(el),
          box,
          color: cs.color,
          fontSize: parseFloat(cs.fontSize) || 16,
          fontWeight: parseInt(cs.fontWeight, 10) || 400,
          isInteractive,
          isPrimaryCandidate: isInteractive && isButton && text.length <= 40 && !el.closest('nav, aside, header, [role="navigation"], [role="tablist"], [role="menu"]'),
          label: (isInteractive || isMedia ? nameOf(el, tag) || text : clean(el.getAttribute('aria-label')) || text || tag).slice(0, 80),
          path: pathOf(el),
          role,
          textLength: text.length,
        });
      }
    }
    if (isInteractive || isMedia) return;
    for (const child of el.children) walk(child);
  };
  if (root === document.body) { for (const child of document.body.children) walk(child); } else { walk(root); }
  return { elements, isScopeMissing: false, scopeBox: scopeEl ? boxOf(scopeEl) : null };
}`;

const toAttentionProbe = (input: AttentionProbeInput): string =>
  `(${PROBE_SOURCE})(${JSON.stringify(input)})`;

export { toAttentionProbe };

export type { AttentionProbeInput, RawAttentionElement, RawAttentionProbe };

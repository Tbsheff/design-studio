import { SOURCE_LOC_ATTR } from "./deps.js";

interface RawColor {
  readonly color: string;
  readonly label: string;
  readonly loc: string | null;
  readonly selector: string;
}

interface RawColors {
  readonly colors: readonly RawColor[];
}

interface ColorProbeInput {
  readonly max: number;
  readonly root: string | null;
}

const COLOR_SOURCE = String.raw`(input) => {
  const LOC = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const rootEl = input.root ? (() => { try { return document.querySelector(input.root); } catch { return null; } })() : document.body;
  if (!rootEl) return { colors: [] };
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
  const clean = (text) => (text || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const opaque = (value) => { const m = /rgba?\(([^)]+)\)/.exec(value); if (!m) return false; const parts = m[1].split(/[\s,\/]+/).filter(Boolean); return parts.length < 4 || Number(parts[3]) >= 0.999; };
  const ownText = (el) => clean([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' '));
  const area = window.innerWidth * window.innerHeight;
  const colors = [];
  for (const el of [rootEl, ...rootEl.querySelectorAll('*')]) {
    if (colors.length >= input.max) break;
    const box = el.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden') continue;
    const text = ownText(el);
    const label = text || clean(el.getAttribute('aria-label')) || el.tagName.toLowerCase();
    const base = { label, loc: el.getAttribute(LOC), selector: pathOf(el) };
    if (opaque(cs.backgroundColor) && box.width * box.height <= area * 0.25) colors.push({ ...base, color: cs.backgroundColor });
    if (text && opaque(cs.color)) colors.push({ ...base, color: cs.color });
  }
  return { colors };
}`;

const toColorProbe = (input: ColorProbeInput): string =>
  `(${COLOR_SOURCE})(${JSON.stringify(input)})`;

export { toColorProbe };

export type { RawColor, RawColors };

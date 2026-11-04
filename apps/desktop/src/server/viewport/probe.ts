import type { LayoutFinding } from "../../shared/actions/_core/contracts.js";
import { layoutProbeExpression, SOURCE_LOC_ATTR } from "./deps.js";

interface RawTap {
  readonly detail: string;
  readonly selector: string;
  readonly source: string | null;
}

interface RawMatrixProbe {
  readonly layout: {
    readonly findings: readonly LayoutFinding[];
    readonly total: number;
  };
  readonly scroll: { readonly scrollWidth: number; readonly width: number };
  readonly taps: { readonly items: readonly RawTap[]; readonly total: number };
}

const LAYOUT_CAP = 20;

const TAP_CAP = 20;

const EXTRA_SOURCE = String.raw`(checkTaps, cap, locAttr) => {
  const TAP = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [role="menuitem"], summary';
  const MIN = 44;
  const segment = (el) => {
    const tag = el.tagName.toLowerCase();
    if (el.id) return tag + '#' + CSS.escape(el.id);
    const cls = [...el.classList].slice(0, 2).map((c) => '.' + CSS.escape(c)).join('');
    return tag + cls;
  };
  const selectorOf = (el) => {
    const parts = [];
    for (let node = el; node && node !== document.body && parts.length < 3; node = node.parentElement) parts.unshift(segment(node));
    return parts.join(' > ') || el.tagName.toLowerCase();
  };
  const label = (el) => (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  const shown = (el, rect) => {
    const style = getComputedStyle(el);
    return rect.width >= 2 && rect.height >= 2 && style.visibility !== 'hidden' && style.display !== 'none' && !el.closest('[aria-hidden="true"]');
  };
  const small = [];
  if (checkTaps) {
    for (const el of document.body.querySelectorAll(TAP)) {
      const rect = el.getBoundingClientRect();
      if (!shown(el, rect) || (rect.width >= MIN && rect.height >= MIN)) continue;
      const owner = el.closest('[' + locAttr + ']');
      small.push({ selector: selectorOf(el), source: owner ? owner.getAttribute(locAttr) : null, detail: 'tap target "' + label(el) + '" is ' + Math.round(rect.width) + 'x' + Math.round(rect.height) + ' px, under 44 px' });
    }
  }
  const root = document.documentElement;
  return { taps: { items: small.slice(0, cap), total: small.length }, scroll: { scrollWidth: root.scrollWidth, width: window.innerWidth } };
}`;

const matrixProbe = (checkTaps: boolean): string =>
  `(() => { const layout = ${layoutProbeExpression(LAYOUT_CAP)}; const extra = (${EXTRA_SOURCE})(${String(checkTaps)}, ${TAP_CAP}, ${JSON.stringify(SOURCE_LOC_ATTR)}); return { layout, taps: extra.taps, scroll: extra.scroll }; })()`;

export { matrixProbe };

export type { RawMatrixProbe, RawTap };

import { SOURCE_LOC_ATTR, probeOnPage } from "./deps.js";
import type { DirectEditRuntime } from "./deps.js";

interface LayoutProbeChild {
  readonly height: number;
  readonly isAbsolute: boolean;
  readonly isInlinePosition: boolean;
  readonly loc: string | null;
  readonly pageCount: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

const PROBE_VIEWPORT = { height: 900, width: 1440 } as const;

const toLayoutProbeExpression = (selector: string): string =>
  `((selector, attr) => {
    let root = null;
    try { root = document.querySelector(selector); } catch { root = null; }
    if (!root) return null;
    const skip = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'META']);
    const out = [];
    for (const el of root.children) {
      if (skip.has(el.tagName)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none') continue;
      const rect = el.getBoundingClientRect();
      const loc = el.getAttribute(attr);
      let pageCount = 1;
      if (loc) pageCount = document.querySelectorAll('[' + attr + '="' + CSS.escape(loc) + '"]').length;
      const isAbsolute = cs.position === 'absolute' || cs.position === 'fixed';
      const isInlinePosition = el.style.position !== '' || el.classList.contains('absolute') || el.classList.contains('fixed');
      out.push({ height: rect.height, isAbsolute, isInlinePosition, loc, pageCount, width: rect.width, x: rect.x, y: rect.y });
    }
    return out;
  })(${JSON.stringify(selector)}, ${JSON.stringify(SOURCE_LOC_ATTR)})`;

const toProbeLayoutChildren = (
  preview: DirectEditRuntime["preview"],
  url: string,
  selector: string
): Promise<LayoutProbeChild[] | null> =>
  probeOnPage<LayoutProbeChild[] | null>(
    preview,
    url,
    PROBE_VIEWPORT,
    toLayoutProbeExpression(selector)
  );

export { toProbeLayoutChildren };

export type { LayoutProbeChild };

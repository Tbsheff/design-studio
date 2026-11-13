import { SOURCE_LOC_ATTR, probeOnPage } from "./deps.js";
import type { DirectEditRuntime } from "./deps.js";
import type { LayoutBox } from "./engine/index.js";

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

interface LayoutFit {
  readonly bottom: number | null;
  readonly right: number | null;
}

interface LayoutProbe {
  readonly children: readonly LayoutProbeChild[];
  readonly fit: LayoutFit;
  readonly frame: LayoutBox;
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
    const box = root.getBoundingClientRect();
    const frame = { height: root.clientHeight, width: root.clientWidth, x: box.x + root.clientLeft, y: box.y + root.clientTop };
    const isAutoSize = (name, size) => {
      const value = root.style.getPropertyValue(name);
      const priority = root.style.getPropertyPriority(name);
      root.style.setProperty(name, 'auto', 'important');
      const next = root.getBoundingClientRect()[name];
      if (value === '') root.style.removeProperty(name);
      else root.style.setProperty(name, value, priority);
      return Math.abs(next - size) < 1;
    };
    const rootStyle = getComputedStyle(root);
    const fit = {
      bottom: isAutoSize('height', box.height) ? parseFloat(rootStyle.paddingBottom) || 0 : null,
      right: isAutoSize('width', box.width) ? parseFloat(rootStyle.paddingRight) || 0 : null,
    };
    return { children: out, fit, frame };
  })(${JSON.stringify(selector)}, ${JSON.stringify(SOURCE_LOC_ATTR)})`;

const toProbeLayoutChildren = (
  preview: DirectEditRuntime["preview"],
  url: string,
  selector: string
): Promise<LayoutProbe | null> =>
  probeOnPage<LayoutProbe | null>(
    preview,
    url,
    PROBE_VIEWPORT,
    toLayoutProbeExpression(selector)
  );

export { toProbeLayoutChildren };

export type { LayoutFit, LayoutProbe, LayoutProbeChild };

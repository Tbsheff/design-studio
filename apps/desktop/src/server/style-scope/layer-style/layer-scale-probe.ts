import { SOURCE_LOC_ATTR, probeOnPage } from "./deps.js";
import type { DirectEditRuntime } from "./deps.js";

interface ScaleProbeLayer {
  readonly authored: Readonly<Record<string, string>>;
  readonly computed: Readonly<Record<string, string>>;
  readonly loc: string;
  readonly pageCount: number;
  readonly rootCount: number;
}

const PROBE_VIEWPORT = { height: 900, width: 1440 } as const;

const LAYER_MAX = 200;

const SHORTHAND_OF = {
  "border-radius": "border-radius",
  "border-width": "border",
  "column-gap": "gap",
  "font-size": "font",
  "line-height": "font",
  "margin-bottom": "margin",
  "margin-left": "margin",
  "margin-right": "margin",
  "margin-top": "margin",
  "padding-bottom": "padding",
  "padding-left": "padding",
  "padding-right": "padding",
  "padding-top": "padding",
  "row-gap": "gap",
} as const satisfies Readonly<Record<string, string>>;

const toScaleProbeExpression = (
  selector: string,
  properties: readonly string[]
): string =>
  `((selector, props, attr, shorthands, max) => {
    let root = null;
    try { root = document.querySelector(selector); } catch { root = null; }
    if (!root) return null;
    const rules = [];
    const walk = (list) => {
      for (const rule of list) {
        if (rule.selectorText !== undefined) rules.push(rule);
        else if (rule.cssRules && (!rule.media || matchMedia(rule.media.mediaText).matches)) walk(rule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules); } catch { continue; }
    }
    const readOne = (decl, prop) => {
      const own = decl.getPropertyValue(prop).trim();
      if (own !== '') return own;
      const short = shorthands[prop];
      if (!short) return '';
      return decl.getPropertyValue(short).trim();
    };
    const authoredOf = (el) => {
      const out = {};
      const matched = rules.filter((rule) => { try { return el.matches(rule.selectorText); } catch { return false; } });
      for (const prop of props) {
        let value = '';
        for (const rule of matched) {
          const next = readOne(rule.style, prop);
          if (next !== '') value = next;
        }
        const inline = readOne(el.style, prop);
        if (inline !== '') value = inline;
        if (value !== '') out[prop] = value;
      }
      return out;
    };
    const computedOf = (el) => {
      const cs = getComputedStyle(el);
      const out = {};
      for (const prop of props) out[prop] = cs.getPropertyValue(prop).trim();
      return out;
    };
    const nodes = [root, ...root.querySelectorAll('[' + attr + ']')].filter((node) => node.hasAttribute(attr));
    const seen = new Map();
    for (const node of nodes) {
      const loc = node.getAttribute(attr);
      const entry = seen.get(loc);
      if (entry) { entry.rootCount += 1; continue; }
      if (seen.size >= max) continue;
      const pageCount = document.querySelectorAll('[' + attr + '="' + CSS.escape(loc) + '"]').length;
      seen.set(loc, { authored: authoredOf(node), computed: computedOf(node), loc, pageCount, rootCount: 1 });
    }
    return [...seen.values()];
  })(${JSON.stringify(selector)}, ${JSON.stringify(properties)}, ${JSON.stringify(SOURCE_LOC_ATTR)}, ${JSON.stringify(SHORTHAND_OF)}, ${LAYER_MAX})`;

const toProbeScaleTree = (
  preview: DirectEditRuntime["preview"],
  url: string,
  selector: string,
  properties: readonly string[]
): Promise<ScaleProbeLayer[] | null> =>
  probeOnPage<ScaleProbeLayer[] | null>(
    preview,
    url,
    PROBE_VIEWPORT,
    toScaleProbeExpression(selector, properties)
  );

export { toProbeScaleTree };

export type { ScaleProbeLayer };

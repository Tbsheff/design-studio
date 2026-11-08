import { SOURCE_LOC_ATTR, probeOnPage } from "./deps.js";
import type { DirectEditRuntime } from "./deps.js";
import type { ReadProperty, StyleDeclaration } from "./engine/index.js";

interface ProbedLayer {
  readonly count: number;
  readonly styles: readonly StyleDeclaration[];
}

const PROBE_VIEWPORT = { height: 900, width: 1440 } as const;

const toProbeExpression = (
  selectors: readonly string[],
  properties: readonly ReadProperty[]
): string =>
  `((selectors, props, attr) => selectors.map((selector) => {
    let el = null;
    try { el = document.querySelector(selector); } catch { el = null; }
    if (!el) return null;
    const cs = getComputedStyle(el);
    const loc = el.getAttribute(attr);
    let count = 1;
    if (loc) {
      count = [...document.querySelectorAll('[' + attr + ']')].filter((node) => node.getAttribute(attr) === loc).length;
    }
    return { count, styles: props.map((p) => ({ property: p.property, value: cs.getPropertyValue(p.read).trim() })) };
  }))(${JSON.stringify(selectors)}, ${JSON.stringify(properties)}, ${JSON.stringify(SOURCE_LOC_ATTR)})`;

const toProbeLayers = (
  preview: DirectEditRuntime["preview"],
  url: string,
  selectors: readonly string[],
  properties: readonly ReadProperty[]
): Promise<(ProbedLayer | null)[]> =>
  probeOnPage<(ProbedLayer | null)[]>(
    preview,
    url,
    PROBE_VIEWPORT,
    toProbeExpression(selectors, properties)
  );

export { toProbeLayers };

export type { ProbedLayer };

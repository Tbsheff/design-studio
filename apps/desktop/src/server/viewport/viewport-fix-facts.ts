import { probeOnPage, SOURCE_LOC_ATTR } from "./deps.js";
import { toCells } from "./engine/cells.js";
import type { FixPageFacts } from "./viewport-fix-types.js";
import type { ViewportRuntime } from "./viewport-runtime.js";

const FACTS_SOURCE = String.raw`(locs, locAttr) => {
  const BLOCK = new Set(['block', 'flex', 'grid', 'flow-root', 'list-item']);
  const ownerLoc = (el) => {
    const owner = el.closest('[' + locAttr + ']');
    return owner ? owner.getAttribute(locAttr) : null;
  };
  const blockParentLoc = (el) => {
    for (let node = el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      if (node.hasAttribute(locAttr) && BLOCK.has(getComputedStyle(node).display)) return node.getAttribute(locAttr);
    }
    return null;
  };
  const factsOf = (el) => {
    const parent = el.parentElement;
    return {
      tag: el.tagName.toLowerCase(),
      display: getComputedStyle(el).display,
      overflowX: getComputedStyle(el).overflowX,
      parentDisplay: parent ? getComputedStyle(parent).display : '',
      blockParentLoc: blockParentLoc(el),
    };
  };
  const inScroller = (el) => {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      if (getComputedStyle(node).overflowX !== 'visible') return true;
    }
    return false;
  };
  const elements = {};
  for (const loc of locs) {
    const el = document.querySelector('[' + locAttr + '=' + JSON.stringify(loc) + ']');
    if (el) elements[loc] = factsOf(el);
  }
  const vw = window.innerWidth;
  const scrollers = [];
  for (const el of document.querySelectorAll('table, pre')) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || (rect.right <= vw + 1 && el.scrollWidth <= vw + 1) || inScroller(el)) continue;
    const loc = ownerLoc(el);
    if (loc) scrollers.push({ loc, facts: factsOf(el) });
  }
  return { elements, scrollers };
}`;

const toFactsExpression = (locs: readonly string[]): string =>
  `(${FACTS_SOURCE})(${JSON.stringify(locs)}, ${JSON.stringify(SOURCE_LOC_ATTR)})`;

const inspectPageFacts = (
  runtime: ViewportRuntime,
  url: string,
  width: number,
  locs: readonly string[]
): Promise<FixPageFacts> => {
  const [cell] = toCells({ schemes: "light", widths: [width] });

  return probeOnPage<FixPageFacts>(
    runtime.preview,
    url,
    { height: cell?.height ?? 0, width },
    toFactsExpression(locs)
  );
};

export { inspectPageFacts };

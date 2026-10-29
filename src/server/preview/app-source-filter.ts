import { APP_SOURCE_PATH, DEV_CHROME_SELECTOR } from '../../shared/app.js';
import type { QualityFinding } from '../../shared/contracts.js';
import type { RenderPage } from './render-backend.js';

const MAX_ANCESTORS = 40;

export function outsideAppExpression(selectors: readonly string[]): string {
  return `(async (selectors) => {
    const fiberOf = (node) => { const key = Object.keys(node).find((k) => k.startsWith('__reactFiber$')); return key ? node[key] : null; };
    const stackOf = (f) => [f?._debugStack?.stack, f?.debugStack?.stack, f?.stack].find((v) => typeof v === 'string' && v.length > 0) || '';
    const chains = selectors.map((selector) => {
      let el = null;
      try { el = document.querySelector(selector); } catch { el = null; }
      if (!el) return null;
      if (el.closest(${JSON.stringify(DEV_CHROME_SELECTOR)})) return 'chrome';
      const stacks = [];
      for (let node = el, n = 0; node && node !== document.body && node !== document.documentElement && n < ${MAX_ANCESTORS}; node = node.parentElement, n += 1) {
        const fiber = fiberOf(node);
        if (!fiber) continue;
        for (const stack of [stackOf(fiber), stackOf(fiber._debugOwner)]) if (stack) stacks.push(stack);
      }
      return stacks;
    });
    const unique = [...new Set(chains.flatMap((c) => Array.isArray(c) ? c : []))];
    const found = new Map();
    for (let i = 0; i < unique.length; i += 20) {
      const part = unique.slice(i, i + 20);
      try {
        const res = await fetch(${JSON.stringify(APP_SOURCE_PATH)}, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stacks: part }), cache: 'no-store' });
        const body = res.ok ? await res.json() : null;
        if (!Array.isArray(body?.sources)) return selectors.map(() => false);
        part.forEach((stack, k) => found.set(stack, typeof body.sources[k] === 'string' && body.sources[k].length > 0));
      } catch { return selectors.map(() => false); }
    }
    if (![...found.values()].some(Boolean)) return chains.map((chain) => chain === 'chrome');
    return chains.map((chain) => chain === 'chrome' || (Array.isArray(chain) && !chain.some((stack) => found.get(stack))));
  })(${JSON.stringify(selectors)})`;
}

export async function dropOutsideApp(page: Pick<RenderPage, 'evaluate'>, findings: QualityFinding[]): Promise<QualityFinding[]> {
  const selectors = [...new Set(findings.flatMap((finding) => (finding.selector ? [finding.selector] : [])))];
  if (selectors.length === 0) return findings;
  const outside = await page.evaluate<boolean[]>(outsideAppExpression(selectors)).catch(() => selectors.map(() => false));
  const drop = new Set(selectors.filter((_, index) => outside[index] === true));
  return drop.size ? findings.filter((finding) => !finding.selector || !drop.has(finding.selector)) : findings;
}

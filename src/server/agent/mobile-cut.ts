import { appSourceBody } from '../components/owner-probe.js';
import { onProbePage } from '../preview/probe-page.js';
import type { PreviewService } from '../types.js';

const MOBILE = { width: 390, height: 844 };
const MAX_CUT = 30;

export interface CutElement {
  text: string;
  tag: string;
  source: string | null;
  usedAt: string | null;
  left: number;
  right: number;
}

function cutExpression(): string {
  return `(async () => {
    const appSource = ${appSourceBody()};
    const width = window.innerWidth;
    const picks = [...document.querySelectorAll('button, a, input, select, textarea, label, h1, h2, h3, h4, h5, h6, p, li, td, th, [role=button], img, svg')];
    const cut = [];
    for (const el of picks) {
      if (cut.length >= ${MAX_CUT}) break;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= width + 1 && r.left >= -1) continue;
      if (el.parentElement && cut.some((c) => c.el.contains(el))) continue;
      cut.push({ el, rect: r });
    }
    return Promise.all(cut.map(async ({ el, rect }) => {
      const app = await appSource(el).catch(() => null);
      return { text: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 60), tag: el.tagName.toLowerCase(), source: app?.loc || null, usedAt: app?.usedAt || null, left: Math.round(rect.left), right: Math.round(rect.right) };
    }));
  })()`;
}

export async function mobileCuts(preview: PreviewService, url: string): Promise<CutElement[]> {
  return onProbePage(preview, url, MOBILE, (page) => page.evaluate<CutElement[]>(cutExpression()));
}

export function cutLine(cut: CutElement): string {
  const side = cut.right > MOBILE.width ? `its right edge is at ${cut.right} px, past the ${MOBILE.width} px screen` : `its left edge is at ${cut.left} px, off the screen`;
  return `- [high] cut-at-390 on <${cut.tag}>${cut.text ? ` "${cut.text}"` : ''}${cut.usedAt || cut.source ? ` (${cut.usedAt || cut.source})` : ''}: at 390 px wide ${side}, so part of it is cut off. Fix: let it wrap or stack (flex-wrap, min-w-0, a column layout under sm:), or shorten it.`;
}

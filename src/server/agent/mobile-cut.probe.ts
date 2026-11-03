import { appSourceBody } from "../components/owner-probe.js";

const MAX_CUT = 30;

const cutExpression = (): string =>
  `(async () => {
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

export { MAX_CUT, cutExpression };

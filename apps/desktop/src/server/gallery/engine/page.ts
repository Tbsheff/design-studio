import type { GalleryCell } from "./cells.js";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  HEAD_HEIGHT,
  LABEL_WIDTH,
  PAGE_PADDING,
} from "./layout.js";

interface PageRequest {
  readonly bundle: string;
  readonly cells: readonly GalleryCell[];
  readonly columns: readonly string[];
  readonly entryPath: string;
  readonly rows: readonly string[];
  readonly title: string;
}

const HTML_ESCAPES = new Map([
  ['"', "&quot;"],
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
]);

const escapeHtml = (text: string): string =>
  text.replaceAll(/["&<>]/gu, (char) => HTML_ESCAPES.get(char) ?? char);

const escapeScript = (code: string): string =>
  code.replaceAll("</script", String.raw`<\/script`);

const STYLE = `<style>
html,body{margin:0;min-height:0!important;height:auto!important}
.g-root{display:grid;box-sizing:border-box;padding:${PAGE_PADDING}px;grid-template-columns:${LABEL_WIDTH}px;gap:0;font:12px/1.3 system-ui,sans-serif;position:relative}
.g-head,.g-row{display:flex;align-items:center;font:600 11px/1.3 system-ui,sans-serif;opacity:.7;text-transform:capitalize}
.g-head{justify-content:center;height:${HEAD_HEIGHT}px;text-align:center}
.g-row{height:${CELL_HEIGHT}px;padding-right:12px}
.g-cell{display:flex;align-items:center;justify-content:center;width:${CELL_WIDTH}px;height:${CELL_HEIGHT}px;box-sizing:border-box}
</style>`;

const RUNTIME = String.raw`(async () => {
  const entry = __ENTRY__;
  const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    const res = await fetch(entry, { credentials: 'include', headers: { accept: 'text/html' } });
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    for (const node of doc.querySelectorAll('link[rel="stylesheet"], head style')) document.head.appendChild(node.cloneNode(true));
    document.documentElement.className = doc.documentElement.className;
    const style = doc.documentElement.getAttribute('style');
    if (style) document.documentElement.setAttribute('style', style);
    document.body.className = doc.body.className;
  } catch (error) {}
  await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.sheet ? true : new Promise((resolve) => { link.onload = link.onerror = resolve; setTimeout(resolve, 8000); })));
  await frames();
  await new Promise((resolve) => setTimeout(resolve, 200));
  const swap = (text) => text
    .replace(/:hover(?![-\w])/g, '[data-gallery-force~="hover"]')
    .replace(/:focus-visible(?![-\w])/g, '[data-gallery-force~="focus"]')
    .replace(/:focus(?![-\w])/g, '[data-gallery-force~="focus"]')
    .replace(/:disabled(?![-\w])/g, '[data-gallery-force~="disabled"]');
  const clone = (rule) => {
    if (rule.type === 1) {
      const next = swap(rule.cssText);
      return next === rule.cssText ? null : next;
    }
    if (rule.cssRules && rule.cssRules.length > 0) {
      const inner = [...rule.cssRules].map(clone).filter(Boolean);
      if (inner.length === 0) return null;
      const text = rule.cssText;
      return text.slice(0, text.indexOf('{')) + '{' + inner.join('\n') + '}';
    }
    return null;
  };
  const out = [];
  for (const sheet of document.styleSheets) {
    try { for (const rule of sheet.cssRules) { const text = clone(rule); if (text) out.push(text); } } catch (error) {}
  }
  const tag = document.createElement('style');
  tag.id = 'gallery-force';
  tag.textContent = out.join('\n');
  document.head.appendChild(tag);
  for (const cell of document.querySelectorAll('.g-cell[data-state]')) {
    const state = cell.getAttribute('data-state');
    if (state === 'default') continue;
    const host = cell.firstElementChild;
    const target = host && host.firstElementChild;
    if (!target) continue;
    if (state === 'disabled') { target.setAttribute('disabled', ''); target.setAttribute('aria-disabled', 'true'); }
    target.setAttribute('data-gallery-force', state);
  }
  await frames();
  window.__galleryReady = true;
})();`;

const cellHtml = (cell: GalleryCell): string =>
  `<div class="g-cell" data-cell="${cell.id}" data-state="${cell.state}" data-label="${escapeHtml(cell.label)}" style="grid-row:${cell.row + 2};grid-column:${cell.column + 2}"><div id="gc-${cell.id}"></div></div>`;

const headHtml = (label: string, column: number): string =>
  `<div class="g-head" style="grid-row:1;grid-column:${column + 2}">${escapeHtml(label)}</div>`;

const rowHtml = (label: string, row: number): string =>
  `<div class="g-row" style="grid-row:${row + 2};grid-column:1">${escapeHtml(label)}</div>`;

const toGalleryHtml = (request: PageRequest): string => {
  const columns = request.columns.length;
  const grid = `grid-template-columns:${LABEL_WIDTH}px repeat(${columns},${CELL_WIDTH}px);grid-template-rows:${HEAD_HEIGHT}px repeat(${request.rows.length},${CELL_HEIGHT}px)`;

  const runtime = RUNTIME.replace(
    "__ENTRY__",
    JSON.stringify(request.entryPath)
  );

  return [
    "<!doctype html>",
    '<html><head><meta charset="utf-8">',
    `<title>${escapeHtml(request.title)}</title>`,
    STYLE,
    "</head><body>",
    `<div class="g-root" style="${grid}">`,
    ...request.columns.map(headHtml),
    ...request.rows.map(rowHtml),
    ...request.cells.map(cellHtml),
    "</div>",
    `<script>${escapeScript(request.bundle)}</script>`,
    `<script>${escapeScript(runtime)}</script>`,
    "</body></html>",
  ].join("\n");
};

export { toGalleryHtml };

export type { PageRequest };

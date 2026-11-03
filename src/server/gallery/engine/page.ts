import type { GalleryCell } from "./cells.js";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  HEAD_HEIGHT,
  LABEL_WIDTH,
  PAGE_PADDING,
} from "./layout.js";
import { RUNTIME } from "./page.probe.js";

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

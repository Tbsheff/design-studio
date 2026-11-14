import { Schema } from "effect";

import { toDecoder } from "../../platform/decode/index.js";
import { PairNodeSchema, toPairsSource } from "./port-pairs-probe.js";

interface MaskProbeInput {
  readonly hide: readonly string[];
  readonly rowLimits: readonly number[] | null;
}

const ProbeRectSchema = Schema.Struct({
  height: Schema.Number,
  width: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
});

const ProbeElementSchema = Schema.Struct({
  height: Schema.Number,
  selector: Schema.String,
  text: Schema.String,
  width: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
});

const MaskProbeSchema = Schema.Struct({
  cellTexts: Schema.Array(Schema.String),
  cells: Schema.Array(ProbeRectSchema),
  elements: Schema.Array(ProbeElementSchema),
  hidden: Schema.Array(Schema.String),
  hiddenRows: Schema.Number,
  nodes: Schema.Array(PairNodeSchema),
  rowCounts: Schema.Array(Schema.Number),
});

type MaskProbe = typeof MaskProbeSchema.Type;

type ProbeElement = typeof ProbeElementSchema.Type;

const EMPTY_PROBE: MaskProbe = {
  cellTexts: [],
  cells: [],
  elements: [],
  hidden: [],
  hiddenRows: 0,
  nodes: [],
  rowCounts: [],
};

const decodeProbe = toDecoder(Schema.fromJsonString(MaskProbeSchema), "ignore");

const PROBE_SOURCE = String.raw`
const norm = (text) => (text || "").replace(/\s+/g, " ").trim();
const isShown = (node) => {
  const box = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
};
const hideNode = (node) => node.style.setProperty("display", "none", "important");
const hidden = [];
for (const text of params.hide) {
  const all = Array.from(document.body.querySelectorAll("*")).filter((node) => !["SCRIPT", "STYLE", "MAIN"].includes(node.tagName) && norm(node.textContent) === text);
  const outer = all.filter((node) => !all.includes(node.parentElement));
  for (const node of outer) { hideNode(node); hidden.push(text); }
}
const groups = [];
for (const body of document.querySelectorAll("tbody")) groups.push(Array.from(body.children).filter((row) => row.tagName === "TR"));
const roleParents = new Set(Array.from(document.querySelectorAll("[role=row]")).map((row) => row.parentElement));
for (const parent of roleParents) if (parent) groups.push(Array.from(parent.children).filter((row) => row.getAttribute("role") === "row"));
for (const list of document.querySelectorAll("ul, ol")) {
  if (list.closest("nav, header, aside, footer")) continue;
  const items = Array.from(list.children).filter((item) => item.tagName === "LI");
  if (items.length >= 3) groups.push(items);
}
const shown = groups.map((rows) => rows.filter(isShown)).filter((rows) => rows.length >= 2);
const rowCounts = shown.map((rows) => rows.length);
let hiddenRows = 0;
const kept = shown.map((rows, index) => {
  const limit = params.rowLimits === null ? rows.length : (params.rowLimits[index] ?? rows.length);
  rows.slice(limit).forEach((row) => { hideNode(row); hiddenRows += 1; });
  return rows.slice(0, limit);
});
const cells = [];
const cellTexts = [];
for (const row of kept.flat()) {
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node && cells.length < 800; node = walker.nextNode()) {
    const text = norm(node.textContent);
    if (text === "") continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) continue;
    cells.push({ x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height });
    if (!cellTexts.includes(text) && cellTexts.length < 40) cellTexts.push(text);
  }
}
const rowSet = new Set(kept.flat());
const toSelector = (start) => {
  const parts = [];
  let node = start;
  while (node && node !== document.body && parts.length < 3) {
    let part = node.tagName.toLowerCase();
    if (node.id) { parts.unshift(part + "#" + node.id); break; }
    const name = Array.from(node.classList).find((item) => /^[A-Za-z][\w-]*$/.test(item));
    if (name) part += "." + name;
    const parent = node.parentElement;
    const same = parent ? Array.from(parent.children).filter((item) => item.tagName === node.tagName) : [];
    if (same.length > 1) part += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
    parts.unshift(part);
    node = parent;
  }
  return parts.join(" > ");
};
const elements = [];
for (const node of document.body.querySelectorAll("h1, h2, h3, h4, h5, h6, p, table, button, a, input, select, textarea, img, label, form, nav, header, footer")) {
  if (elements.length >= 200 || !isShown(node) || Array.from(rowSet).some((row) => row.contains(node))) continue;
  const box = node.getBoundingClientRect();
  elements.push({ selector: toSelector(node), text: norm((node.tagName === "TABLE" && node.tHead ? node.tHead.innerText : node.innerText) || node.getAttribute("alt") || node.getAttribute("placeholder")).slice(0, 40), x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height });
}
return JSON.stringify({ cellTexts, cells, elements, hidden, hiddenRows, nodes: toPairNodes(rowSet), rowCounts });
`;

const toMaskProbe = (input: MaskProbeInput): string =>
  [
    "(() => {",
    `const params = ${JSON.stringify(input)};`,
    toPairsSource(),
    PROBE_SOURCE,
    "})()",
  ].join("\n");

export { EMPTY_PROBE, decodeProbe, toMaskProbe };

export type { MaskProbe, MaskProbeInput, ProbeElement };

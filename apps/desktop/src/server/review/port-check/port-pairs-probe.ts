import { Schema } from "effect";

const PAIR_NODES_MAX = 400;

const PAIR_TEXT_MAX = 120;

const PAIR_PROPERTIES = [
  "margin-top",
  "margin-bottom",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "gap",
  "font-size",
  "line-height",
  "font-weight",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-left-radius",
] as const;

const PairSourceSchema = Schema.Struct({
  col: Schema.Number,
  file: Schema.String,
  line: Schema.Number,
});

const PairNodeSchema = Schema.Struct({
  classes: Schema.String,
  height: Schema.Number,
  isTextOwner: Schema.Boolean,
  parent: Schema.Number,
  selector: Schema.String,
  source: Schema.NullOr(PairSourceSchema),
  tag: Schema.String,
  text: Schema.String,
  values: Schema.Array(Schema.String),
  width: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
});

type PairNode = typeof PairNodeSchema.Type;

type PairSource = typeof PairSourceSchema.Type;

const PAIRS_SOURCE = String.raw`
const isTextOwnerOf = (node) => Array.from(node.childNodes).some((child) => child.nodeType === 3 && norm(child.textContent) !== "");
const toPairSources = async (nodes) => {
  if (!params.isSourced || typeof window.__studioSourceLocs !== "function") return nodes.map(() => null);
  try { return await window.__studioSourceLocs(nodes); } catch { return nodes.map(() => null); }
};
const toPairNodes = async (rows) => {
  const skipTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "BR", "WBR"]);
  const rowNodes = new Set();
  for (const row of rows) { rowNodes.add(row); row.querySelectorAll("*").forEach((child) => rowNodes.add(child)); }
  const found = [];
  const indexOf = new Map();
  for (const node of document.body.querySelectorAll("*")) {
    if (found.length >= pairLimits.nodes) break;
    if (skipTags.has(node.tagName) || rowNodes.has(node) || !isShown(node)) continue;
    let parent = node.parentElement;
    while (parent && !indexOf.has(parent)) parent = parent.parentElement;
    indexOf.set(node, found.length);
    found.push({ node, parent: parent ? indexOf.get(parent) : -1, text: "" });
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let item = walker.nextNode(); item; item = walker.nextNode()) {
    const value = norm(item.textContent);
    const owner = item.parentElement;
    if (value === "" || !owner || rowNodes.has(owner) || owner.closest("script, style, noscript, template") || owner.getClientRects().length === 0) continue;
    for (let at = owner; at; at = at.parentElement) {
      const index = indexOf.get(at);
      if (index === undefined || found[index].text.length >= pairLimits.text) continue;
      found[index].text = (found[index].text + " " + value).trim().slice(0, pairLimits.text);
    }
  }
  const sources = await toPairSources(found.map((entry) => entry.node));
  return found.map((entry, index) => {
    const box = entry.node.getBoundingClientRect();
    const style = getComputedStyle(entry.node);
    return { classes: entry.node.getAttribute("class") || "", height: box.height, isTextOwner: isTextOwnerOf(entry.node), parent: entry.parent, selector: toSelector(entry.node), source: sources[index] || null, tag: entry.node.tagName.toLowerCase(), text: entry.text, values: pairProperties.map((name) => style.getPropertyValue(name)), width: box.width, x: box.x + scrollX, y: box.y + scrollY };
  });
};
`;

const toPairsSource = (): string =>
  [
    `const pairProperties = ${JSON.stringify(PAIR_PROPERTIES)};`,
    `const pairLimits = ${JSON.stringify({ nodes: PAIR_NODES_MAX, text: PAIR_TEXT_MAX })};`,
    PAIRS_SOURCE,
  ].join("\n");

export { PAIR_PROPERTIES, PairNodeSchema, toPairsSource };

export type { PairNode, PairSource };

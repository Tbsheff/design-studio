import {
  PORT_AREA_ELEMENTS_MAX,
  PORT_DIFFS_MAX,
} from "@design-studio/actions/port/schema";
import type {
  PortArea,
  PortDiff,
  PortElement,
  PortFirstShift,
} from "@design-studio/actions/port/schema";

import { isInArea, toRank } from "./port-masks.js";
import { BORDER_WIDTH, BOX_NAMES, toValueDiffs } from "./port-pair-values.js";
import type { PairNode } from "./port-pairs-probe.js";

interface PortPair {
  readonly app: PairNode;
  readonly appIndex: number;
  readonly diffs: readonly PortDiff[];
  readonly prototype: PairNode;
}

interface AbovePick {
  readonly focus: readonly string[];
  readonly pair: PortPair;
}

const SHIFT_MIN = 2;

const PAIRS_LISTED_MAX = 8;

const LABEL_MAX = 40;

const NO_PARENT = -1;

const SHIFT_FOCUS = ["margin-top"];

const ABOVE_FOCUS = ["margin-bottom", "padding-bottom", "height", BORDER_WIDTH];

const PARENT_FOCUS = ["padding-top", BORDER_WIDTH, "gap"];

const STRUCTURE_TAGS: ReadonlySet<string> = new Set([
  "table",
  "thead",
  "img",
  "svg",
  "input",
  "select",
  "textarea",
  "button",
  "form",
  "nav",
  "header",
  "footer",
  "section",
  "aside",
  "main",
  "ul",
  "ol",
  "hr",
]);

const toKey = (node: PairNode): string | null => {
  if (node.text !== "") {
    return `text:${node.text.toLowerCase()}`;
  }

  if (STRUCTURE_TAGS.has(node.tag)) {
    return `tag:${node.tag}`;
  }

  return null;
};

const toParent = (nodes: readonly PairNode[], index: number): number =>
  nodes[index]?.parent ?? NO_PARENT;

const isAncestor = (
  nodes: readonly PairNode[],
  ancestor: number,
  index: number
): boolean => {
  for (
    let at = toParent(nodes, index);
    at !== NO_PARENT;
    at = toParent(nodes, at)
  ) {
    if (at === ancestor) {
      return true;
    }
  }

  return false;
};

const toGroups = (nodes: readonly PairNode[]): Map<string, number[]> => {
  const groups = new Map<string, number[]>();

  for (const [index, node] of nodes.entries()) {
    const key = toKey(node);

    if (key !== null) {
      groups.set(key, [...(groups.get(key) ?? []), index]);
    }
  }

  return groups;
};

const toChainKeys = (
  nodes: readonly PairNode[],
  members: readonly number[]
): Map<number, string> => {
  const memberSet = new Set(members);
  const keys = new Map<number, string>();

  const leaves = members.filter(
    (member) => !members.some((other) => isAncestor(nodes, member, other))
  );

  for (const [order, leaf] of leaves.entries()) {
    keys.set(leaf, `${order}:0`);
    let level = 0;

    for (
      let at = toParent(nodes, leaf);
      at !== NO_PARENT && !keys.has(at);
      at = toParent(nodes, at)
    ) {
      if (memberSet.has(at)) {
        level += 1;
        keys.set(at, `${order}:${level}`);
      }
    }
  }

  return keys;
};

const toNodeKeys = (nodes: readonly PairNode[]): Map<string, number> => {
  const keys = new Map<string, number>();

  for (const [groupKey, members] of toGroups(nodes)) {
    for (const [index, chainKey] of toChainKeys(nodes, members)) {
      keys.set(`${groupKey}#${chainKey}`, index);
    }
  }

  return keys;
};

const toLeafCounts = (
  keys: ReadonlyMap<string, number>
): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const key of keys.keys()) {
    if (key.endsWith(":0")) {
      const group = key.slice(0, key.lastIndexOf("#"));

      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
  }

  return counts;
};

const toPairs = (
  app: readonly PairNode[],
  prototype: readonly PairNode[]
): PortPair[] => {
  const prototypeKeys = toNodeKeys(prototype);
  const appKeys = toNodeKeys(app);
  const appCounts = toLeafCounts(appKeys);
  const prototypeCounts = toLeafCounts(prototypeKeys);
  const pairs: PortPair[] = [];

  for (const [key, index] of appKeys) {
    const group = key.slice(0, key.lastIndexOf("#"));
    const isSameCount = appCounts.get(group) === prototypeCounts.get(group);
    const appNode = app[index] ?? null;

    const prototypeNode =
      prototype[prototypeKeys.get(key) ?? NO_PARENT] ?? null;

    if (isSameCount && appNode !== null && prototypeNode !== null) {
      pairs.push({
        app: appNode,
        appIndex: index,
        diffs: toValueDiffs(appNode, prototypeNode),
        prototype: prototypeNode,
      });
    }
  }

  return pairs.toSorted((first, second) => first.appIndex - second.appIndex);
};

const toElement = (
  pair: PortPair,
  diffs: readonly PortDiff[]
): PortElement => ({
  diffs: diffs.slice(0, PORT_DIFFS_MAX),
  selector: pair.app.selector,
  text: pair.app.text.slice(0, LABEL_MAX),
});

const toFocusDiffs = (pair: PortPair, focus: readonly string[]): PortDiff[] =>
  focus.flatMap((name) => pair.diffs.filter((item) => item.property === name));

const toFocusFirst = (pair: PortPair, focus: readonly string[]): PortDiff[] => {
  const names = new Set(focus);

  return [
    ...toFocusDiffs(pair, focus),
    ...pair.diffs.filter((item) => !names.has(item.property)),
  ];
};

const toPairedParent = (
  nodes: readonly PairNode[],
  byIndex: ReadonlyMap<number, PortPair>,
  pair: PortPair
): PortPair | null => {
  for (
    let at = toParent(nodes, pair.appIndex);
    at !== NO_PARENT;
    at = toParent(nodes, at)
  ) {
    const found = byIndex.get(at) ?? null;

    if (found !== null) {
      return found;
    }
  }

  return null;
};

const toAbovePick = (
  pairs: readonly PortPair[],
  at: number,
  nodes: readonly PairNode[]
): AbovePick | null => {
  const shifted = pairs[at] ?? null;
  const previous = pairs[at - 1] ?? null;

  if (shifted === null || previous === null) {
    return null;
  }

  if (isAncestor(nodes, previous.appIndex, shifted.appIndex)) {
    return { focus: PARENT_FOCUS, pair: previous };
  }

  const byIndex = new Map(pairs.map((pair) => [pair.appIndex, pair]));
  const chain = [previous];

  for (
    let parent = toPairedParent(nodes, byIndex, previous);
    parent !== null && !isAncestor(nodes, parent.appIndex, shifted.appIndex);
    parent = toPairedParent(nodes, byIndex, parent)
  ) {
    chain.push(parent);
  }

  const picked =
    chain
      .toReversed()
      .find((pair) => toFocusDiffs(pair, ABOVE_FOCUS).length > 0) ??
    chain.at(-1) ??
    previous;

  return { focus: ABOVE_FOCUS, pair: picked };
};

const toShiftAt = (
  pairs: readonly PortPair[],
  at: number,
  shift: number,
  nodes: readonly PairNode[]
): PortFirstShift | null => {
  const shifted = pairs[at] ?? null;

  if (shifted === null) {
    return null;
  }

  const above = toAbovePick(pairs, at, nodes);
  let aboveElement: PortElement | null = null;

  if (above !== null) {
    aboveElement = toElement(above.pair, toFocusFirst(above.pair, above.focus));
  }

  return {
    above: aboveElement,
    element: toElement(shifted, toFocusFirst(shifted, SHIFT_FOCUS)),
    shift,
  };
};

const toFirstShift = (
  pairs: readonly PortPair[],
  nodes: readonly PairNode[]
): PortFirstShift | null => {
  let previous = 0;

  for (const [at, pair] of pairs.entries()) {
    const offset = Math.round(pair.app.y - pair.prototype.y);

    if (Math.abs(offset - previous) >= SHIFT_MIN) {
      return toShiftAt(pairs, at, offset - previous, nodes);
    }

    previous = offset;
  }

  return null;
};

const hasStyleDiff = (pair: PortPair): boolean =>
  pair.diffs.some((item) => !BOX_NAMES.has(item.property));

const toShiftSelectors = (shift: PortFirstShift | null): Set<string> =>
  new Set(
    [shift?.element.selector ?? "", shift?.above?.selector ?? ""].filter(
      (selector) => selector !== ""
    )
  );

const toAreaPairs = (
  pairs: readonly PortPair[],
  area: PortArea,
  width: number,
  shown: ReadonlySet<string>
): PortPair[] =>
  pairs
    .filter(
      (pair) =>
        hasStyleDiff(pair) &&
        !shown.has(pair.app.selector) &&
        isInArea(pair.app, area, width)
    )
    .toSorted((first, second) => toRank(first.app) - toRank(second.app));

const toShiftCount = (shift: PortFirstShift | null): number => {
  if (shift === null) {
    return 0;
  }

  if (shift.above === null) {
    return 1;
  }

  return 2;
};

const toPairedAreas = (
  areas: readonly PortArea[],
  pairs: readonly PortPair[],
  width: number,
  shift: PortFirstShift | null
): PortArea[] => {
  let left = PAIRS_LISTED_MAX - toShiftCount(shift);
  const shown = toShiftSelectors(shift);

  return areas.map((area) => {
    const picked = toAreaPairs(pairs, area, width, shown).slice(
      0,
      Math.max(0, Math.min(PORT_AREA_ELEMENTS_MAX, left))
    );

    left -= picked.length;

    const named = new Set(picked.map((pair) => pair.app.selector));

    const elements = [
      ...picked.map((pair) => toElement(pair, pair.diffs)),
      ...area.elements.filter((element) => !named.has(element.selector)),
    ].slice(0, PORT_AREA_ELEMENTS_MAX);

    return { ...area, elements };
  });
};

export { toFirstShift, toPairedAreas, toPairs };

export type { PortPair };

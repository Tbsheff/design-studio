import type {
  PortArea,
  PortDiff,
  PortElement,
  PortFirstShift,
  PortMatch,
} from "@design-studio/actions/port/schema";
import type { ClassChange } from "@design-studio/contracts";

import { decideClassEdit } from "../../direct-edit/index.js";
import type { TailwindTheme } from "../../direct-edit/index.js";
import { toPartChoice } from "./port-apply.js";
import type { PairNode } from "./port-pairs-probe.js";
import type { PortPair } from "./port-pairs.js";

type NodeLookup = ReadonlyMap<string, PairNode>;

type HintSite = ReturnType<Parameters<typeof decideClassEdit>[0]>;

const NO_CLASSES: ClassChange = {};

const toHintSite = (classes: string): HintSite => ({
  create: null,
  dynamic: false,
  segments: [
    {
      direct: true,
      editable: true,
      end: classes.length,
      escape: "jsx" as const,
      glueEnd: false,
      glueStart: false,
      quote: '"',
      start: 0,
      text: classes,
    },
  ],
  unsafe: null,
});

const toDecision = (
  node: PairNode,
  style: Readonly<Record<string, string>>,
  theme: TailwindTheme
): ReturnType<typeof decideClassEdit> | null => {
  try {
    return decideClassEdit(
      () => toHintSite(node.classes),
      { ...style },
      NO_CLASSES,
      theme
    );
  } catch {
    return null;
  }
};

const toWriteHint = (
  node: PairNode,
  diff: PortDiff,
  theme: TailwindTheme
): string | null => {
  const choice = toPartChoice(node, diff);

  if (choice.kind !== "write") {
    return null;
  }

  const decision = toDecision(node, choice.style, theme);

  if (decision?.kind !== "classes") {
    return null;
  }

  const delta = decision.patch.outcome.delta ?? null;

  if (delta === null || delta.add.length === 0) {
    return null;
  }

  if (delta.remove.length === 0) {
    return delta.add.join(" ");
  }

  return `${delta.add.join(" ")}, not ${delta.remove.join(" ")}`;
};

const toHintedElement = (
  element: PortElement,
  nodes: NodeLookup,
  theme: TailwindTheme
): PortElement => {
  const node = nodes.get(element.selector) ?? null;

  if (node === null) {
    return element;
  }

  return {
    ...element,
    diffs: element.diffs.map((diff) => ({
      ...diff,
      write: toWriteHint(node, diff, theme),
    })),
  };
};

const toHintedAbove = (
  above: PortElement | null,
  nodes: NodeLookup,
  theme: TailwindTheme
): PortElement | null => {
  if (above === null) {
    return null;
  }

  return toHintedElement(above, nodes, theme);
};

const toHintedShift = (
  shift: PortFirstShift | null,
  nodes: NodeLookup,
  theme: TailwindTheme
): PortFirstShift | null => {
  if (shift === null) {
    return null;
  }

  return {
    above: toHintedAbove(shift.above, nodes, theme),
    element: toHintedElement(shift.element, nodes, theme),
    shift: shift.shift,
  };
};

const toHintedArea = (
  area: PortArea,
  nodes: NodeLookup,
  theme: TailwindTheme
): PortArea => ({
  ...area,
  elements: area.elements.map((element) =>
    toHintedElement(element, nodes, theme)
  ),
});

const toNodeLookup = (pairs: readonly PortPair[]): NodeLookup => {
  const nodes = new Map<string, PairNode>();

  for (const pair of pairs) {
    if (!nodes.has(pair.app.selector)) {
      nodes.set(pair.app.selector, pair.app);
    }
  }

  return nodes;
};

const toHintedMatch = (
  match: PortMatch,
  pairs: readonly PortPair[],
  theme: TailwindTheme | null
): PortMatch => {
  if (theme === null) {
    return match;
  }

  const nodes = toNodeLookup(pairs);

  return {
    ...match,
    areas: match.areas.map((area) => toHintedArea(area, nodes, theme)),
    firstShift: toHintedShift(match.firstShift, nodes, theme),
  };
};

export { toHintedMatch };

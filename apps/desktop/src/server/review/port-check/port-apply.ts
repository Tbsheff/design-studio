import type {
  PortDiff,
  PortSkip,
  PortSkipReason,
} from "@design-studio/actions/port/schema";
import { BORDER_SIDE_WIDTHS } from "@design-studio/contracts/border-side-properties";

import { BORDER_WIDTH } from "./port-pair-values.js";
import type { PairNode, PairSource } from "./port-pairs-probe.js";
import type { PortPair } from "./port-pairs.js";

interface PortApplyPart {
  readonly diff: PortDiff;
  readonly style: Readonly<Record<string, string>>;
}

interface PortApplyEdit {
  readonly parts: readonly PortApplyPart[];
  readonly selector: string;
  readonly source: PairSource;
  readonly style: Readonly<Record<string, string>>;
  readonly text: string;
}

interface PortApplyPlan {
  readonly edits: readonly PortApplyEdit[];
  readonly skipped: readonly PortSkip[];
}

type PartChoice =
  | { readonly kind: "drop" }
  | { readonly kind: "skip"; readonly reason: PortSkipReason }
  | { readonly kind: "write"; readonly style: Record<string, string> };

const NORMAL_PX = /^normal \([\d.]+px\)$/u;

const VARIANT = String.raw`(?:[\w-]+:)*`;

const TEXT_SIZE = new RegExp(
  String.raw`^${VARIANT}text-(?:xs|sm|base|lg|[2-9]?xl|\[[\d.]+(?:px|rem|em)\])(?:\/\S+)?$`,
  "u"
);

const LEADING = new RegExp(`^${VARIANT}leading-`, "u");

const WEIGHT = new RegExp(
  String.raw`^${VARIANT}font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$`,
  "u"
);

const MAX_WIDTH = new RegExp(`^${VARIANT}max-w-`, "u");

const FIXED_WIDTH = new RegExp(String.raw`^${VARIANT}w-(?:\d|\[)`, "u");

const DROP: PartChoice = { kind: "drop" };

const toTokens = (node: PairNode): string[] =>
  node.classes.split(/\s+/u).filter((token) => token !== "");

const hasToken = (node: PairNode, patterns: readonly RegExp[]): boolean =>
  toTokens(node).some((token) =>
    patterns.some((pattern) => pattern.test(token))
  );

const TYPE_PATTERNS: ReadonlyMap<string, readonly RegExp[]> = new Map([
  ["font-size", [TEXT_SIZE]],
  ["font-weight", [WEIGHT]],
  ["line-height", [TEXT_SIZE, LEADING]],
]);

const toWriteValue = (value: string): string => {
  if (NORMAL_PX.test(value)) {
    return "normal";
  }

  return value;
};

const toWrite = (property: string, value: string): PartChoice => ({
  kind: "write",
  style: { [property]: toWriteValue(value) },
});

const toSkip = (reason: PortSkipReason): PartChoice => ({
  kind: "skip",
  reason,
});

const toBorderChoice = (diff: PortDiff): PartChoice => {
  const sides = diff.prototype.split(" ");

  if (sides.length === 1) {
    return toWrite(BORDER_WIDTH, diff.prototype);
  }

  return {
    kind: "write",
    style: Object.fromEntries(
      BORDER_SIDE_WIDTHS.map((side, index) => [side, sides[index] ?? "0px"])
    ),
  };
};

const toWidthChoice = (node: PairNode, diff: PortDiff): PartChoice => {
  if (hasToken(node, [MAX_WIDTH])) {
    return toWrite("max-width", diff.prototype);
  }

  if (hasToken(node, [FIXED_WIDTH])) {
    return toWrite("width", diff.prototype);
  }

  return toSkip("follows-parent");
};

const toTypeChoice = (
  node: PairNode,
  diff: PortDiff,
  patterns: readonly RegExp[]
): PartChoice => {
  if (node.isTextOwner || hasToken(node, patterns)) {
    return toWrite(diff.property, diff.prototype);
  }

  return toSkip("inherited");
};

const toChoice = (node: PairNode, diff: PortDiff): PartChoice => {
  const patterns = TYPE_PATTERNS.get(diff.property) ?? null;

  if (diff.property === "height") {
    return DROP;
  }

  if (diff.property === "width") {
    return toWidthChoice(node, diff);
  }

  if (diff.property === BORDER_WIDTH) {
    return toBorderChoice(diff);
  }

  if (patterns !== null) {
    return toTypeChoice(node, diff, patterns);
  }

  return toWrite(diff.property, diff.prototype);
};

const toSourceKey = (source: PairSource): string =>
  `${source.file}:${source.line}:${source.col}`;

const toSourceCounts = (nodes: readonly PairNode[]): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const node of nodes) {
    if (node.source !== null) {
      const key = toSourceKey(node.source);

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return counts;
};

const toSkipItem = (
  pair: PortPair,
  diff: PortDiff,
  skipReason: PortSkipReason
): PortSkip => ({
  app: diff.app,
  property: diff.property,
  prototype: diff.prototype,
  reason: skipReason,
  selector: pair.app.selector,
  text: pair.app.text,
});

const toSiteReason = (
  pair: PortPair,
  counts: ReadonlyMap<string, number>
): PortSkipReason | null => {
  const { source } = pair.app;

  if (source === null) {
    return "no-source";
  }

  if ((counts.get(toSourceKey(source)) ?? 0) > 1) {
    return "shared-site";
  }

  return null;
};

interface PairPlan {
  readonly edit: PortApplyEdit | null;
  readonly skipped: readonly PortSkip[];
}

const toPairPlan = (
  pair: PortPair,
  counts: ReadonlyMap<string, number>
): PairPlan => {
  const parts: PortApplyPart[] = [];
  const skipped: PortSkip[] = [];
  const siteReason = toSiteReason(pair, counts);

  for (const diff of pair.diffs) {
    const choice = toChoice(pair.app, diff);

    if (choice.kind === "skip") {
      skipped.push(toSkipItem(pair, diff, choice.reason));
    }

    if (choice.kind === "write" && siteReason !== null) {
      skipped.push(toSkipItem(pair, diff, siteReason));
    }

    if (choice.kind === "write" && siteReason === null) {
      parts.push({ diff, style: choice.style });
    }
  }

  const site = pair.app.source;

  if (parts.length === 0 || site === null) {
    return { edit: null, skipped };
  }

  return {
    edit: {
      parts,
      selector: pair.app.selector,
      source: site,
      style: Object.assign({}, ...parts.map((part) => part.style)),
      text: pair.app.text,
    },
    skipped,
  };
};

const toPortApplyPlan = (
  pairs: readonly PortPair[],
  appNodes: readonly PairNode[]
): PortApplyPlan => {
  const counts = toSourceCounts(appNodes);
  const plans = pairs.map((pair) => toPairPlan(pair, counts));

  return {
    edits: plans.flatMap((plan) => {
      if (plan.edit === null) {
        return [];
      }

      return [plan.edit];
    }),
    skipped: plans.flatMap((plan) => plan.skipped),
  };
};

export { toPortApplyPlan };

export type { PortApplyEdit, PortApplyPart, PortApplyPlan };

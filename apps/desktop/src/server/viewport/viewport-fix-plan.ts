import { createHash } from "node:crypto";

import type { SourceLoc } from "@design-studio/contracts";
import { Effect } from "effect";

import {
  toBreakpointPrefix,
  toFixDecision,
  toMediaLine,
  toScopedClasses,
} from "./engine/fix-rules.js";
import type { FixIntent, FixKind } from "./engine/fix-rules.js";
import { inspectSite } from "./viewport-fix-site.js";
import type { FixSite, SiteScope } from "./viewport-fix-site.js";
import type {
  FixApplied,
  FixEdit,
  FixPageFacts,
  FixPlan,
  FixSkipped,
} from "./viewport-fix-types.js";

interface FixFinding {
  readonly kind: FixKind;
  readonly source: string | null;
  readonly width: number;
}

type FixFact = FixPageFacts["elements"][string];

interface FixItem {
  readonly facts: FixFact | null;
  readonly kind: FixKind;
  readonly locText: string | null;
  readonly reason: string | null;
  readonly width: number;
}

interface PlanEdit {
  readonly add: string[];
  readonly lines: string[];
  readonly loc: SourceLoc;
  readonly tag: string;
}

interface PlanState {
  readonly applied: FixApplied[];
  readonly edits: Map<string, PlanEdit>;
  readonly sites: Map<string, FixSite | null>;
  readonly skipped: FixSkipped[];
}

interface Target {
  readonly edit: PlanEdit;
  readonly locText: string;
  readonly site: FixSite;
}

const MARKER_PREFIX = "studio-rs-";

const MARKER_FORMAT = /^studio-rs-[a-z0-9]{8}$/u;

const MARKER_LENGTH = 8;

const NO_STAMP = "The element has no source stamp, so no layer id.";

const NOT_FOUND = "The element is not on the page at this width.";

const NO_SITE = "The source file of the element cannot be edited.";

const NO_MODE =
  "The file does not use Tailwind and is not HTML, so there is no safe place for a rule.";

const NO_PARENT = "The element has no stamped block parent.";

const NO_SCROLL = "No table or pre causes the sideways scroll.";

const toMarker = (locText: string, classes: readonly string[]): string => {
  const known = classes.find((token) => MARKER_FORMAT.test(token));

  if (known) {
    return known;
  }

  const hash = createHash("sha1").update(locText).digest("hex");

  return `${MARKER_PREFIX}${hash.slice(0, MARKER_LENGTH)}`;
};

const toItem = (
  finding: FixFinding,
  source: string | null,
  found: FixFact | null,
  why: string | null
): FixItem => ({
  facts: found,
  kind: finding.kind,
  locText: source,
  reason: why,
  width: finding.width,
});

const toScrollItems = (
  finding: FixFinding,
  page: FixPageFacts | null
): readonly FixItem[] => {
  const scrollers = page?.scrollers ?? [];

  if (scrollers.length === 0) {
    return [toItem(finding, null, null, NO_SCROLL)];
  }

  return scrollers.map((scroller) =>
    toItem(finding, scroller.loc, scroller.facts, null)
  );
};

const toItems = (
  findings: readonly FixFinding[],
  facts: ReadonlyMap<number, FixPageFacts>
): readonly FixItem[] =>
  findings.flatMap((finding): readonly FixItem[] => {
    const page = facts.get(finding.width) ?? null;

    if (finding.kind === "horizontal-scroll") {
      return toScrollItems(finding, page);
    }

    if (finding.source === null) {
      return [toItem(finding, null, null, NO_STAMP)];
    }

    const found = page?.elements[finding.source] ?? null;

    if (found === null) {
      return [toItem(finding, finding.source, null, NOT_FOUND)];
    }

    return [toItem(finding, finding.source, found, null)];
  });

const getSite = Effect.fn("getSite")(function* run(
  scope: SiteScope,
  state: PlanState,
  locText: string
) {
  if (state.sites.has(locText)) {
    return state.sites.get(locText) ?? null;
  }

  const site = yield* inspectSite(scope, locText);
  state.sites.set(locText, site);

  return site;
});

const setSkipped = (
  state: PlanState,
  item: FixItem,
  locText: string | null,
  why: string
): void => {
  state.skipped.push({
    kind: item.kind,
    layerId: locText,
    reason: why,
    width: item.width,
  });
};

const getEdit = (
  state: PlanState,
  locText: string,
  site: FixSite,
  tag: string
): PlanEdit => {
  const known = state.edits.get(locText) ?? null;

  if (known !== null) {
    return known;
  }

  const edit: PlanEdit = { add: [], lines: [], loc: site.loc, tag };
  state.edits.set(locText, edit);

  return edit;
};

const applyClasses = (
  state: PlanState,
  item: FixItem,
  intent: FixIntent,
  target: Target
): void => {
  const { edit, locText, site } = target;
  const prefix = toBreakpointPrefix(item.width, site.breakpoints);
  const scoped = toScopedClasses(prefix, intent.classes);
  const queued = new Set(edit.add);
  const have = new Set(site.classes);
  const fresh = scoped.filter((token) => !queued.has(token));

  if (fresh.length === 0) {
    return;
  }

  const added = fresh.filter((token) => !have.has(token));

  if (added.length === 0) {
    setSkipped(state, item, locText, "Already fixed at this width.");

    return;
  }

  edit.add.push(...added);

  state.applied.push({
    after: [...site.classes, ...edit.add].join(" "),
    before: site.classes.join(" "),
    kind: item.kind,
    layerId: locText,
    width: item.width,
  });
};

const applyRule = (
  state: PlanState,
  item: FixItem,
  intent: FixIntent,
  target: Target
): void => {
  const { edit, locText, site } = target;
  const marker = toMarker(locText, site.classes);
  const line = toMediaLine(marker, item.width, intent.declarations);

  if (edit.lines.includes(line)) {
    return;
  }

  if (site.text.includes(line)) {
    setSkipped(state, item, locText, "Already fixed at this width.");

    return;
  }

  edit.lines.push(line);

  const isKnown = site.classes.includes(marker) || edit.add.includes(marker);

  if (!isKnown) {
    edit.add.push(marker);
  }

  state.applied.push({
    after: line,
    before: "",
    kind: item.kind,
    layerId: locText,
    width: item.width,
  });
};

const applyTarget = (
  state: PlanState,
  item: FixItem,
  intent: FixIntent,
  target: Target
): void => {
  if (target.site.mode === "classes") {
    applyClasses(state, item, intent, target);

    return;
  }

  if (target.site.mode === "css") {
    applyRule(state, item, intent, target);

    return;
  }

  setSkipped(state, item, target.locText, NO_MODE);
};

const applyItem = Effect.fn("applyItem")(function* run(
  scope: SiteScope,
  state: PlanState,
  item: FixItem
) {
  const { facts, locText } = item;

  if (item.reason !== null || facts === null || locText === null) {
    setSkipped(state, item, locText, item.reason ?? NOT_FOUND);

    return;
  }

  const own = yield* getSite(scope, state, locText);

  if (own === null) {
    setSkipped(state, item, locText, NO_SITE);

    return;
  }

  const decision = toFixDecision(item.kind, facts, own.classes);

  if (!decision.isFixable) {
    setSkipped(state, item, locText, decision.reason);

    return;
  }

  const { intent } = decision;
  let targetText = locText;

  if (intent.isParent) {
    targetText = facts.blockParentLoc ?? "";
  }

  const targetSite = yield* getSite(scope, state, targetText);

  if (targetText === "" || targetSite === null) {
    setSkipped(state, item, locText, NO_PARENT);

    return;
  }

  const picked = getEdit(state, targetText, targetSite, facts.tag);

  applyTarget(state, item, intent, {
    edit: picked,
    locText: targetText,
    site: targetSite,
  });
});

const toFixEdit = (edit: PlanEdit): FixEdit => ({
  add: edit.add,
  lines: edit.lines,
  loc: edit.loc,
  tag: edit.tag,
});

const createFixPlan = Effect.fn("createFixPlan")(function* run(
  scope: SiteScope,
  findings: readonly FixFinding[],
  facts: ReadonlyMap<number, FixPageFacts>
) {
  const state: PlanState = {
    applied: [],
    edits: new Map(),
    sites: new Map(),
    skipped: [],
  };

  for (const item of toItems(findings, facts)) {
    yield* applyItem(scope, state, item);
  }

  const plan: FixPlan = {
    applied: state.applied,
    edits: [...state.edits.values()].flatMap((edit) => {
      if (edit.add.length === 0 && edit.lines.length === 0) {
        return [];
      }

      return [toFixEdit(edit)];
    }),
    skipped: state.skipped,
  };

  return plan;
});

export { createFixPlan };

export type { FixFinding };

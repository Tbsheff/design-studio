import type { LayerLayoutChangeSchema } from "@design-studio/actions/layer-style/schema";
import type { Effect } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import {
  assertCanEdit,
  isLayerRef,
  memoPage,
  runDirectionWrite,
  scopeOf,
  withPagePath,
} from "./deps.js";
import type { DirectionIds, DirectionRun, SourceLoc } from "./deps.js";
import { toAutoLayout } from "./engine/index.js";
import type {
  AutoLayoutPlan,
  LayoutBox,
  LayoutDirection,
  LayoutKind,
} from "./engine/index.js";
import { LayerStyleError } from "./errors.js";
import {
  toCommitted,
  toEditsByFile,
  toFileWork,
  toPatchedWork,
} from "./layer-layout-files.js";
import type { ChildEdit, FileWork, LayoutStyle } from "./layer-layout-files.js";
import { toReorderedChildren } from "./layer-layout-order.js";
import type { LayoutSlot } from "./layer-layout-order.js";
import { toPaddingStyle, toPaddingText } from "./layer-layout-padding.js";
import { toProbeLayoutChildren } from "./layer-layout-probe.js";
import type { LayoutProbeChild } from "./layer-layout-probe.js";
import { toLayerStyleFailure } from "./layer-style-failure.js";
import { toResolvedLayers } from "./layer-style-resolve.js";
import { loadLayerSite } from "./layer-style-site.js";

type LayerLayoutChange = typeof LayerLayoutChangeSchema.Type;

type LayoutSkip = LayerLayoutChange["skipped"][number];

interface SetLayerLayoutCommand {
  readonly directionId: string | null;
  readonly gap: string | null;
  readonly layerId: string;
  readonly layout: LayoutKind;
  readonly padding: "auto" | null;
  readonly projectId: string;
}

interface LayoutTarget {
  readonly children: readonly LayoutProbeChild[];
  readonly frame: LayoutBox;
  readonly source: SourceLoc;
}

interface ParentLayout {
  readonly gap: string | null;
  readonly padding: string | null;
  readonly style: LayoutStyle;
}

const MAIN_DIRECTION_ID = "main";

const LOC_PATTERN = /^(?<file>.+):(?<line>\d+):(?<col>\d+)$/u;

const NUMBER_PATTERN = /^\d+(?:\.\d+)?$/u;

const NO_SOURCE = "This layer has no source location in the project files.";

const NO_LAYER = "This layer is not on the page. Open its page and try again.";

const CHILD_NO_SOURCE =
  "This child has no source location in the project files, so it keeps its place.";

const CHILD_REPEATED =
  "This child comes from data or a shared component, so it keeps its place. Edit the code, or ask the agent.";

const CLEAR_POSITION = {
  bottom: null,
  inset: null,
  left: null,
  position: null,
  right: null,
  top: null,
} as const;

const STATIC_POSITION = { position: "static" } as const;

const toIds = (command: SetLayerLayoutCommand): DirectionIds => {
  if (command.directionId === null) {
    return { directionId: MAIN_DIRECTION_ID, projectId: command.projectId };
  }

  return { directionId: command.directionId, projectId: command.projectId };
};

const toSourceLoc = (loc: string | null): SourceLoc | null => {
  const groups = LOC_PATTERN.exec(loc ?? "")?.groups;

  if (!groups) {
    return null;
  }

  return {
    col: Number(groups.col),
    file: groups.file ?? "",
    line: Number(groups.line),
  };
};

const toGapText = (gap: string): string => {
  const trimmed = gap.trim();

  if (NUMBER_PATTERN.test(trimmed)) {
    return `${trimmed}px`;
  }

  return trimmed;
};

const toPageUrl = async (
  run: DirectionRun,
  layerId: string
): Promise<string> => {
  const base = await run.runtime.preview.directionUrl(
    run.project,
    run.direction
  );

  const scope = scopeOf(run.project.id, run.direction.id);
  let page = "";

  if (isLayerRef(layerId)) {
    page = memoPage(scope, layerId.trim()) ?? "";
  }

  if (page === "") {
    return withPagePath(base);
  }

  return withPagePath(base, page);
};

const toLayoutTarget = async (
  run: DirectionRun,
  command: SetLayerLayoutCommand
): Promise<LayoutTarget> => {
  const scope = {
    direction: run.direction,
    project: run.project,
    runtime: run.runtime,
  };

  const [root] = await toResolvedLayers(scope, [command.layerId], []);

  if (!root || root.source === null) {
    throw new LayerStyleError(NO_SOURCE);
  }

  const url = await toPageUrl(run, command.layerId);

  const probe = await toProbeLayoutChildren(
    run.runtime.preview,
    url,
    root.selector
  );

  if (probe === null) {
    throw new LayerStyleError(NO_LAYER);
  }

  return { children: probe.children, frame: probe.frame, source: root.source };
};

const toSkips = (children: readonly LayoutProbeChild[]): LayoutSkip[] =>
  children.flatMap((child, index) => {
    const layerId = child.loc ?? `child ${index + 1}`;

    if (!child.isAbsolute) {
      return [];
    }

    if (toSourceLoc(child.loc) === null) {
      return [{ layerId, reason: CHILD_NO_SOURCE }];
    }

    if (child.pageCount !== 1) {
      return [{ layerId, reason: CHILD_REPEATED }];
    }

    return [];
  });

const toSlots = (
  children: readonly LayoutProbeChild[]
): LayoutSlot[] | null => {
  const slots = children.map((child) => toSourceLoc(child.loc));
  const [first = null] = slots;

  if (first === null || children.some((child) => child.pageCount !== 1)) {
    return null;
  }

  const located = slots.flatMap((loc) => loc ?? []);

  if (
    located.length !== slots.length ||
    located.some((loc) => loc.file !== first.file)
  ) {
    return null;
  }

  return located.map((loc, index) => ({ index, loc }));
};

const toChildStyle = (child: LayoutProbeChild): LayoutStyle => {
  if (child.isInlinePosition) {
    return CLEAR_POSITION;
  }

  return STATIC_POSITION;
};

const toChildEdits = (
  children: readonly LayoutProbeChild[],
  locs: readonly (SourceLoc | null)[]
): ChildEdit[] =>
  children.flatMap((child, index) => {
    const loc = locs[index] ?? null;

    if (!child.isAbsolute || child.pageCount !== 1 || loc === null) {
      return [];
    }

    return [{ loc, style: toChildStyle(child) }];
  });

const toGapValue = (
  plan: AutoLayoutPlan,
  command: SetLayerLayoutCommand
): string | null => {
  if (command.gap !== null) {
    return toGapText(command.gap);
  }

  if (plan.hasAbsolute && plan.gap !== null) {
    return `${plan.gap}px`;
  }

  return null;
};

const toDirectionStyle = (
  plan: AutoLayoutPlan,
  command: SetLayerLayoutCommand
): LayoutStyle => {
  if (plan.hasAbsolute || command.layout !== "auto") {
    return { "align-items": "flex-start", "flex-direction": plan.direction };
  }

  return {};
};

const toWrittenDirection = (
  plan: AutoLayoutPlan,
  command: SetLayerLayoutCommand
): LayoutDirection => {
  if (plan.hasAbsolute || command.layout !== "auto") {
    return plan.direction;
  }

  return "row";
};

const toGapStyle = (gap: string | null): LayoutStyle => {
  if (gap === null) {
    return {};
  }

  return { gap };
};

const toParentLayout = (
  plan: AutoLayoutPlan,
  command: SetLayerLayoutCommand,
  isTailwind: boolean
): ParentLayout => {
  const gap = toGapValue(plan, command);

  return {
    gap,
    padding: toPaddingText(plan.padding),
    style: {
      display: "flex",
      ...toDirectionStyle(plan, command),
      ...toGapStyle(gap),
      ...toPaddingStyle(plan.padding, isTailwind),
    },
  };
};

const toPaddingFrame = (
  target: LayoutTarget,
  command: SetLayerLayoutCommand
): LayoutBox | null => {
  if (command.padding === null) {
    return null;
  }

  return target.frame;
};

const toReorder = async (
  run: DirectionRun,
  works: Map<string, FileWork>,
  target: LayoutTarget,
  plan: AutoLayoutPlan
): Promise<{
  readonly locs: readonly (SourceLoc | null)[];
  readonly moved: number;
}> => {
  const locs = target.children.map((child) => toSourceLoc(child.loc));
  const slots = toSlots(target.children);
  const order = plan.order.map(Number);
  const isIdentity = order.every((value, index) => value === index);

  if (slots === null || isIdentity || !plan.hasAbsolute) {
    return { locs, moved: 0 };
  }

  const file = slots[0]?.loc.file ?? "";
  const work = await toFileWork(run, works, file);
  const reordered = toReorderedChildren(work, slots, order);

  if (reordered === null) {
    return { locs, moved: 0 };
  }

  works.set(file, { ...work, code: reordered.code });

  return { locs: reordered.locs, moved: reordered.moved };
};

const setLayerLayout = async (
  run: DirectionRun,
  command: SetLayerLayoutCommand
): Promise<LayerLayoutChange> => {
  assertCanEdit(run.runtime.editDeps, run.project, run.direction);

  const target = await toLayoutTarget(run, command);

  const site = await loadLayerSite(
    { project: run.project, workTree: run.direction.workTree },
    target.source
  );

  const plan = toAutoLayout(
    target.children.map((child, index) => ({
      box: child,
      isAbsolute: child.isAbsolute,
      key: String(index),
    })),
    command.layout,
    site.isTailwind,
    toPaddingFrame(target, command)
  );

  const works = new Map<string, FileWork>();
  const reorder = await toReorder(run, works, target, plan);
  const parent = toParentLayout(plan, command, site.isTailwind);

  const edits = [
    ...toChildEdits(target.children, reorder.locs),
    { loc: target.source, style: parent.style },
  ];

  const byFile = toEditsByFile(edits);

  const loaded = await Promise.all(
    [...byFile.entries()].map(async ([file, fileEdits]) => ({
      file,
      work: toPatchedWork(await toFileWork(run, works, file), fileEdits),
    }))
  );

  for (const entry of loaded) {
    works.set(entry.file, entry.work);
  }

  const changed = [...works.values()].filter(
    (work) => work.code !== work.original
  );

  const base = {
    direction: toWrittenDirection(plan, command),
    gap: parent.gap,
    movedChildren: reorder.moved,
    padding: parent.padding,
    skipped: toSkips(target.children),
  };

  if (changed.length === 0) {
    return { ...base, versionId: null };
  }

  const versionId = await toCommitted(
    run,
    changed,
    `Auto layout: ${base.direction}`
  );

  return { ...base, versionId };
};

const runLayerLayout = (
  command: SetLayerLayoutCommand
): Effect.Effect<LayerLayoutChange, KnownFailure> =>
  runDirectionWrite(
    toIds(command),
    (run) => setLayerLayout(run, command),
    toLayerStyleFailure
  );

export { runLayerLayout };

export type { LayerLayoutChange, SetLayerLayoutCommand };

import type { LayerScaleChangeSchema } from "@design-studio/actions/layer-style/schema";
import type { Effect } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import {
  SCALE_PROPERTIES,
  SOURCE_LOC_ATTR,
  applyDirectEditBatch,
  isLayerRef,
  memoPage,
  parseDirectEditRequest,
  runDirectionWrite,
  scopeOf,
  toScaledStyles,
  withPagePath,
} from "./deps.js";
import type {
  DirectEditRequest,
  DirectionIds,
  DirectionRun,
  SourceLoc,
} from "./deps.js";
import { LayerStyleError } from "./errors.js";
import { toProbeScaleTree } from "./layer-scale-probe.js";
import type { ScaleProbeLayer } from "./layer-scale-probe.js";
import { toLayerStyleFailure } from "./layer-style-failure.js";
import { toResolvedLayers } from "./layer-style-resolve.js";
import { loadLayerSite } from "./layer-style-site.js";

type LayerScaleChange = typeof LayerScaleChangeSchema.Type;

type ScaleSkip = LayerScaleChange["skipped"][number];

interface ScaleLayerStyleCommand {
  readonly directionId: string | null;
  readonly factor: number;
  readonly layerId: string;
  readonly projectId: string;
  readonly shouldKeepTokens: boolean;
}

interface PlannedScale {
  readonly edit: DirectEditRequest | null;
  readonly layerId: string;
  readonly skipped: readonly ScaleSkip[];
  readonly tokenCount: number;
}

const MAIN_DIRECTION_ID = "main";

const LOC_PATTERN = /^(?<file>.+):(?<line>\d+):(?<col>\d+)$/u;

const NO_SOURCE = "This layer has no source location in the project files.";

const TOKEN_KEPT = "Uses a token. Keep tokens is on.";

const TOO_LONG = "The new value is too long to write. Edit it by hand.";

const DYNAMIC =
  "The class list is built in code. Edit the code, or ask the agent.";

const toIds = (command: ScaleLayerStyleCommand): DirectionIds => {
  if (command.directionId === null) {
    return { directionId: MAIN_DIRECTION_ID, projectId: command.projectId };
  }

  return { directionId: command.directionId, projectId: command.projectId };
};

const toSourceLoc = (loc: string): SourceLoc | null => {
  const groups = LOC_PATTERN.exec(loc)?.groups;

  if (!groups) {
    return null;
  }

  return {
    col: Number(groups.col),
    file: groups.file ?? "",
    line: Number(groups.line),
  };
};

const toLocSelector = (loc: string): string => `[${SOURCE_LOC_ATTR}="${loc}"]`;

const toSkip = (id: string, text: string): PlannedScale => ({
  edit: null,
  layerId: id,
  skipped: [{ layerId: id, property: null, reason: text }],
  tokenCount: 0,
});

const toRepeatReason = (layer: ScaleProbeLayer): string =>
  `This layer shows ${layer.pageCount} times on the page, and only ${layer.rootCount} are inside the scaled layer. Scale a layer that holds all of them, or ask the agent.`;

const toPlannedScale = async (
  run: DirectionRun,
  layer: ScaleProbeLayer,
  command: ScaleLayerStyleCommand,
  rootLoc: string
): Promise<PlannedScale> => {
  const loc = toSourceLoc(layer.loc);

  if (loc === null) {
    return toSkip(layer.loc, NO_SOURCE);
  }

  if (layer.pageCount !== layer.rootCount) {
    return toSkip(layer.loc, toRepeatReason(layer));
  }

  const site = await loadLayerSite(
    { project: run.project, workTree: run.direction.workTree },
    loc
  );

  if (site.isDynamic) {
    return toSkip(layer.loc, DYNAMIC);
  }

  const scaled = toScaledStyles(
    {
      authored: layer.authored,
      computed: layer.computed,
      isRoot: layer.loc === rootLoc,
      site,
    },
    { factor: command.factor, shouldKeepTokens: command.shouldKeepTokens }
  );

  const kept = scaled.tokens.flatMap((name) => {
    if (!command.shouldKeepTokens) {
      return [];
    }

    return [{ layerId: layer.loc, property: name, reason: TOKEN_KEPT }];
  });

  const long = scaled.tooLong.map((name) => ({
    layerId: layer.loc,
    property: name,
    reason: TOO_LONG,
  }));

  let request: DirectEditRequest | null = null;

  if (Object.keys(scaled.style).length > 0) {
    request = parseDirectEditRequest({
      selector: toLocSelector(layer.loc),
      source: loc,
      style: scaled.style,
    });
  }

  return {
    edit: request,
    layerId: layer.loc,
    skipped: [...kept, ...long],
    tokenCount: scaled.tokens.length,
  };
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

const toProbedTree = async (
  run: DirectionRun,
  command: ScaleLayerStyleCommand
): Promise<ScaleProbeLayer[]> => {
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

  const tree = await toProbeScaleTree(
    run.runtime.preview,
    url,
    root.selector,
    SCALE_PROPERTIES
  );

  if (tree === null || tree.length === 0) {
    throw new LayerStyleError(NO_SOURCE);
  }

  return tree;
};

const updateLayerTree = async (
  run: DirectionRun,
  command: ScaleLayerStyleCommand
): Promise<LayerScaleChange> => {
  const tree = await toProbedTree(run, command);

  const rootLoc = tree[0]?.loc ?? "";

  const planned = await Promise.all(
    tree.map((layer) => toPlannedScale(run, layer, command, rootLoc))
  );

  const edits = planned.flatMap((entry) => entry.edit ?? []);
  const skips = planned.flatMap((entry) => entry.skipped);
  const tokens = planned.reduce((sum, entry) => sum + entry.tokenCount, 0);

  if (edits.length === 0) {
    return { changed: [], skipped: skips, tokenCount: tokens, versionId: null };
  }

  const result = await applyDirectEditBatch(
    run.runtime.editDeps,
    run.project,
    run.direction,
    { edits }
  );

  const done = planned.flatMap((entry) => {
    if (entry.edit === null) {
      return [];
    }

    return [entry.layerId];
  });

  return {
    changed: done,
    skipped: skips,
    tokenCount: tokens,
    versionId: result.version.id,
  };
};

const runLayerScale = (
  command: ScaleLayerStyleCommand
): Effect.Effect<LayerScaleChange, KnownFailure> =>
  runDirectionWrite(
    toIds(command),
    (run) => updateLayerTree(run, command),
    toLayerStyleFailure
  );

export { runLayerScale };

export type { LayerScaleChange, ScaleLayerStyleCommand };

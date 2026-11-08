import type { LayerStyleChangeSchema } from "@design-studio/actions/layer-style/schema";

import {
  DIRECT_STYLE_PROPERTIES,
  applyDirectEditBatch,
  parseDirectEditRequest,
} from "./deps.js";
import type { DirectEditRequest, DirectionRun } from "./deps.js";
import {
  toClassPlan,
  toDeclarationPlan,
  toOrderedGroups,
  toReadProperties,
} from "./engine/index.js";
import type { LayerStyleGroup, StyleDeclaration } from "./engine/index.js";
import { LayerStyleError } from "./errors.js";
import { toResolvedLayers } from "./layer-style-resolve.js";
import type { ResolvedLayer } from "./layer-style-resolve.js";
import { loadLayerSite } from "./layer-style-site.js";
import type { LayerSite } from "./layer-style-site.js";

type LayerStyleChange = typeof LayerStyleChangeSchema.Type;

interface ApplyRequest {
  readonly groups: readonly LayerStyleGroup[];
  readonly sourceLayerId: string;
  readonly targetLayerIds: readonly string[];
}

interface Candidate {
  readonly layer: ResolvedLayer;
  readonly site: LayerSite;
}

interface Planned {
  readonly edit: DirectEditRequest | null;
  readonly layerId: string;
  readonly reason: string | null;
}

const NO_SOURCE = "This layer has no source location in the project files.";

const CLASS_LIMIT = 30;

const VALUE_LIMIT = 200;

const STYLE_PROPERTIES = new Set<string>(DIRECT_STYLE_PROPERTIES);

const NO_SITE: LayerSite = {
  classes: [],
  isDynamic: false,
  isTailwind: false,
  theme: null,
};

const SAME_STYLE = "Already has this style.";

const toSkipReason = (
  candidate: Candidate,
  source: Candidate
): string | null => {
  const { layer, site } = candidate;

  if (layer.source === null) {
    return NO_SOURCE;
  }

  if (layer.usedBy !== null) {
    return `Part of the shared component ${layer.usedBy.name}. Edit the component, or ask the agent. Used ${layer.count} times.`;
  }

  if (layer.count > 1) {
    return `This element comes from a list or a shared template and shows ${layer.count} times on the page. Edit the source, or ask the agent.`;
  }

  if (site.isDynamic) {
    return "The class list is built in code. Edit the code, or ask the agent.";
  }

  if (site.isTailwind !== source.site.isTailwind) {
    return "The source and this layer use different style systems (Tailwind classes and CSS).";
  }

  return null;
};

const toRequest = (
  layer: ResolvedLayer,
  change: Pick<DirectEditRequest, "classes" | "style">
): DirectEditRequest | null => {
  if (layer.source === null) {
    return null;
  }

  return parseDirectEditRequest({
    ...change,
    selector: layer.selector,
    source: layer.source,
  });
};

const toStyleChange = (
  source: Candidate,
  target: Candidate
): DirectEditRequest | null => {
  const plan = toDeclarationPlan(
    source.layer.styles,
    target.layer.styles
  ).filter(
    (entry: StyleDeclaration) =>
      STYLE_PROPERTIES.has(entry.property) &&
      entry.value.length <= VALUE_LIMIT &&
      entry.value !== ""
  );

  if (plan.length === 0) {
    return null;
  }

  const style = Object.fromEntries(
    plan.map((entry) => [entry.property, entry.value])
  );

  return toRequest(target.layer, { style });
};

const toClassChange = (
  source: Candidate,
  target: Candidate,
  groups: readonly LayerStyleGroup[]
): DirectEditRequest | null => {
  const plan = toClassPlan(
    source.site.classes,
    target.site.classes,
    groups,
    target.site.theme
  );

  if (plan.add.length === 0 && plan.remove.length === 0) {
    return null;
  }

  if (plan.add.length > CLASS_LIMIT || plan.remove.length > CLASS_LIMIT) {
    throw new LayerStyleError(
      `More than ${CLASS_LIMIT} class changes. Pick fewer groups.`
    );
  }

  return toRequest(target.layer, {
    classes: { add: [...plan.add], remove: [...plan.remove] },
  });
};

const toChosenEdit = (
  source: Candidate,
  target: Candidate,
  groups: readonly LayerStyleGroup[]
): DirectEditRequest | null => {
  if (target.site.isTailwind) {
    return toClassChange(source, target, groups);
  }

  return toStyleChange(source, target);
};

const toPlanned = (
  source: Candidate,
  target: Candidate,
  groups: readonly LayerStyleGroup[]
): Planned => {
  const id = target.layer.layerId;
  const reason = toSkipReason(target, source);

  if (reason !== null) {
    return { edit: null, layerId: id, reason };
  }

  try {
    const edit = toChosenEdit(source, target, groups);

    if (edit === null) {
      return { edit: null, layerId: id, reason: SAME_STYLE };
    }

    return { edit, layerId: id, reason: null };
  } catch (error) {
    if (error instanceof Error) {
      return { edit: null, layerId: id, reason: error.message };
    }

    throw error;
  }
};

const toCandidate = async (
  run: DirectionRun,
  layer: ResolvedLayer
): Promise<Candidate> => {
  if (layer.source === null) {
    return { layer, site: NO_SITE };
  }

  const site = await loadLayerSite(
    { project: run.project, workTree: run.direction.workTree },
    layer.source
  );

  return { layer, site };
};

const toTargetIds = (request: ApplyRequest): string[] =>
  [...new Set(request.targetLayerIds)].filter(
    (layerId) => layerId !== request.sourceLayerId
  );

const applyLayerStyleBatch = async (
  run: DirectionRun,
  request: ApplyRequest
): Promise<LayerStyleChange> => {
  const groups = toOrderedGroups(request.groups);
  const ids = [request.sourceLayerId, ...toTargetIds(request)];

  const scope = {
    direction: run.direction,
    project: run.project,
    runtime: run.runtime,
  };

  const layers = await toResolvedLayers(scope, ids, toReadProperties(groups));

  const candidates = await Promise.all(
    layers.map((layer) => toCandidate(run, layer))
  );

  const [source, ...targets] = candidates;

  if (!source || source.layer.source === null) {
    throw new LayerStyleError(NO_SOURCE);
  }

  const planned = targets.map((target) => toPlanned(source, target, groups));
  const edits = planned.flatMap((entry) => entry.edit ?? []);

  const skipped = planned.flatMap((entry) => {
    if (entry.reason === null) {
      return [];
    }

    return [{ layerId: entry.layerId, reason: entry.reason }];
  });

  if (edits.length === 0) {
    return { changed: [], skipped: [...skipped], versionId: null };
  }

  const result = await applyDirectEditBatch(
    run.runtime.editDeps,
    run.project,
    run.direction,
    { edits }
  );

  const changed = planned.flatMap((entry) => {
    if (entry.edit === null) {
      return [];
    }

    return [entry.layerId];
  });

  return { changed, skipped, versionId: result.version.id };
};

export { applyLayerStyleBatch };

export type { ApplyRequest, LayerStyleChange };

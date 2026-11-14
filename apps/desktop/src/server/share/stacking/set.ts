import {
  commitStackingEdit,
  guardStackingEdit,
  planDirectEdit,
} from "./deps.js";
import type {
  DirectEditDeps,
  DirectEditRequest,
  SourceLoc,
  StackingChanges,
  StackingInput,
  StackingScope,
  StackingSetResult,
  Version,
  WrittenFile,
} from "./deps.js";
import {
  stackingClassChanges,
  stackingCssStyle,
} from "./engine/stacking-write.js";
import type { ClassChanges } from "./engine/stacking-write.js";
import { StackingError } from "./errors.js";
import { toLayerFiles, toLayersTitle } from "./set-layers.js";
import { loadStackingTarget } from "./site.js";
import type { StackingTargetSite } from "./site.js";

interface StackingTarget {
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

interface StackingSetRequest {
  readonly input: StackingInput;
  readonly target: StackingTarget;
}

interface LayerPlan {
  readonly edit: DirectEditRequest;
  readonly parts: EditParts;
  readonly target: StackingTargetSite;
}

interface StackingPlan {
  readonly classes: ClassChanges | null;
  readonly input: StackingInput;
  readonly mode: StackingSetResult["mode"];
  readonly prefix: string;
  readonly style: Readonly<Record<string, string | null>>;
  readonly title: string;
  readonly written: WrittenFile[];
}

interface StackingDone {
  readonly plan: StackingPlan;
  readonly version: Version;
}

interface EditParts {
  readonly classes: ClassChanges | null;
  readonly style: StackingChanges;
}

const SAME = "The layer already has these stacking values.";

const toTitleOf = (input: StackingInput): string => {
  const parts = Object.entries(input.changes).map(([prop, value]) => {
    if ((value ?? null) === null) {
      return `reset ${prop}`;
    }

    return `${prop} ${value}`;
  });

  if (input.breakpoint === "base") {
    return `Stacking: ${parts.join(", ")}`;
  }

  return `Stacking at ${input.breakpoint}: ${parts.join(", ")}`;
};

const toPartsOf = (
  target: StackingTargetSite,
  input: StackingInput
): EditParts => {
  if (target.mode === "none") {
    throw new StackingError(
      target.reason ?? "This layer takes no stacking edit."
    );
  }

  if (target.mode === "css") {
    return { classes: null, style: stackingCssStyle(input.changes) };
  }

  const result = stackingClassChanges(
    target.classes,
    target.prefix,
    input.changes,
    target.site.theme
  );

  if (!result.ok) {
    throw new StackingError(result.code);
  }

  if (result.value.add.length === 0 && result.value.remove.length === 0) {
    throw new StackingError(SAME);
  }

  return { classes: result.value, style: {} };
};

const toEditRequest = (
  target: StackingTarget,
  parts: EditParts,
  prefix: string
): DirectEditRequest => {
  const request: DirectEditRequest = {
    selector: target.selector ?? "",
    source: target.source,
  };

  if (parts.classes === null) {
    request.style = parts.style as DirectEditRequest["style"];
  } else {
    request.classes = { add: parts.classes.add, remove: parts.classes.remove };
  }

  if (target.tag !== null) {
    request.tag = target.tag;
  }

  if (prefix !== "") {
    request.variant = prefix;
  }

  return request;
};

const toLayerPlan = async (
  scope: StackingScope,
  request: StackingSetRequest
): Promise<LayerPlan> => {
  const target = await loadStackingTarget(
    scope,
    request.target.source,
    request.input.breakpoint
  );

  const parts = toPartsOf(target, request.input);

  return {
    edit: toEditRequest(request.target, parts, target.prefix),
    parts,
    target,
  };
};

const toStackingPlan = (
  request: StackingSetRequest,
  layer: LayerPlan,
  written: WrittenFile[],
  layers: number
): StackingPlan => {
  const title = toTitleOf(request.input);

  return {
    classes: layer.parts.classes,
    input: request.input,
    mode: layer.target.mode,
    prefix: layer.target.prefix,
    style: layer.parts.style,
    title: toLayersTitle(title, layers),
    written,
  };
};

const toPlanStacking = async (
  scope: StackingScope,
  request: StackingSetRequest
): Promise<StackingPlan> => {
  const layer = await toLayerPlan(scope, request);

  const planned = await planDirectEdit(scope.workTree, layer.edit, null, {
    projectKind: scope.project.kind,
  });

  if (planned.patch.code === planned.original) {
    throw new StackingError(SAME);
  }

  const written: WrittenFile[] = [
    {
      code: planned.patch.code,
      original: planned.original,
      target: planned.target,
    },
  ];

  return toStackingPlan(request, layer, written, 1);
};

const toOtherEdit = async (
  scope: StackingScope,
  request: StackingSetRequest
): Promise<DirectEditRequest | null> => {
  try {
    const layer = await toLayerPlan(scope, request);

    return layer.edit;
  } catch (error) {
    if (error instanceof StackingError && error.message === SAME) {
      return null;
    }

    throw error;
  }
};

const toPlanStackingMany = async (
  scope: StackingScope,
  request: StackingSetRequest,
  others: readonly StackingSetRequest[]
): Promise<StackingPlan> => {
  const [layer, rest] = await Promise.all([
    toLayerPlan(scope, request),
    Promise.all(others.map((other) => toOtherEdit(scope, other))),
  ]);

  const edits = [layer.edit, ...rest.filter((edit) => edit !== null)];

  const written = await toLayerFiles(scope, edits);

  if (written.length === 0) {
    throw new StackingError(SAME);
  }

  return toStackingPlan(request, layer, written, edits.length);
};

const toPlanFor = (
  scope: StackingScope,
  request: StackingSetRequest,
  others: readonly StackingSetRequest[]
): Promise<StackingPlan> => {
  if (others.length === 0) {
    return toPlanStacking(scope, request);
  }

  return toPlanStackingMany(scope, request, others);
};

const applyStacking = async (
  deps: DirectEditDeps,
  scope: StackingScope,
  request: StackingSetRequest,
  others: readonly StackingSetRequest[]
): Promise<StackingDone> => {
  guardStackingEdit(deps, scope);

  const plan = await toPlanFor(scope, request, others);

  const version = await commitStackingEdit(
    deps,
    scope,
    plan.written,
    plan.title
  );

  return { plan, version };
};

const toStackingResult = (
  plan: StackingPlan,
  version: Version | null
): StackingSetResult => ({
  breakpoint: plan.input.breakpoint,
  classes: plan.classes,
  files: plan.written.map((entry) => entry.target.relative),
  mode: plan.mode,
  prefix: plan.prefix,
  style: plan.style,
  title: plan.title,
  versionId: version?.id ?? null,
});

export { toPlanStacking as planStacking, applyStacking, toStackingResult };

export type { StackingDone, StackingPlan, StackingSetRequest, StackingTarget };

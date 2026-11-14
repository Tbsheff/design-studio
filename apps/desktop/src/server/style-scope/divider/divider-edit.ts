import {
  assertCanEdit,
  normalizeVariant,
  parseDirectEditRequest,
  planDirectEdit,
  publishVersion,
  writeAndCommitAll,
} from "./deps.js";
import type {
  DirectEditDeps,
  SourceLoc,
  Version,
  WrittenFile,
} from "./deps.js";
import { toDividerChanges, toDividerParts } from "./divider-classes.js";
import type {
  DividerClassChanges,
  DividerPaint,
  DividerParts,
} from "./divider-classes.js";
import { toDividerSite } from "./divider-site.js";
import type { DividerScope } from "./divider-site.js";
import { DividerError } from "./errors.js";

interface DividerTarget {
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

interface DividerInfo extends DividerParts {
  readonly classes: readonly string[];
  readonly mode: "classes" | "css";
}

interface DividerSetRequest {
  readonly paint: DividerPaint;
  readonly target: DividerTarget;
  readonly variant: string;
}

interface DividerSetDone {
  readonly classes: DividerClassChanges;
  readonly title: string;
  readonly version: Version;
  readonly written: WrittenFile[];
}

const SAME = "The element already has these lines.";

const CSS_NOTE =
  "Lines between items need a Tailwind project. In a CSS project, add the rule in code.";

const toVariantOf = (raw: string): string => {
  const variant = normalizeVariant(raw);

  if (variant === null) {
    throw new DividerError(
      `The variant ${raw} is not a known state or breakpoint. Use a prefix such as hover: or md:.`
    );
  }

  return variant;
};

const inspectDivider = async (
  scope: DividerScope,
  source: SourceLoc,
  rawVariant: string
): Promise<DividerInfo> => {
  const site = await toDividerSite(scope, source);
  const variant = toVariantOf(rawVariant);
  const parts = toDividerParts(site.classes, variant, site.colorNames);

  return {
    ...parts,
    classes: site.classes.filter((token) => token.includes("divide-")),
    mode: site.mode,
  };
};

const toTitleOf = (paint: DividerPaint, variant: string): string => {
  const scope = variant.slice(0, -1);
  const head = ["Lines between", scope].filter(Boolean).join(" ");

  if (paint.axis === null) {
    return `${head}: off`;
  }

  return `${head}: ${paint.axis}, ${paint.width}px`;
};

const toEditBase = (
  target: DividerTarget,
  changes: DividerClassChanges,
  variant: string
): Parameters<typeof parseDirectEditRequest>[0] => {
  const base = {
    classes: changes,
    selector: target.selector ?? "",
    source: target.source,
    variant,
  };

  if (target.tag !== null) {
    return { ...base, tag: target.tag };
  }

  return base;
};

const toWritten = async (
  scope: DividerScope,
  request: DividerSetRequest,
  classes: DividerClassChanges,
  variant: string
): Promise<WrittenFile[]> => {
  const planned = await planDirectEdit(
    scope.workTree,
    parseDirectEditRequest(toEditBase(request.target, classes, variant)),
    null,
    { projectKind: scope.project.kind }
  );

  if (planned.patch.code === planned.original) {
    throw new DividerError(SAME);
  }

  return [
    {
      code: planned.patch.code,
      original: planned.original,
      target: planned.target,
    },
  ];
};

const toRecordHistory = (
  deps: DirectEditDeps,
  scope: DividerScope,
  written: readonly WrittenFile[],
  version: Version
): void => {
  deps.history?.record({
    directionId: scope.direction.id,
    files: written.map((entry) => ({
      after: entry.code,
      before: entry.original,
      file: entry.target.file,
      relative: entry.target.relative,
    })),
    label: version.title,
    projectId: scope.project.id,
    versionId: version.id,
  });
};

const toCommitted = async (
  deps: DirectEditDeps,
  scope: DividerScope,
  written: WrittenFile[],
  title: string
): Promise<Version> => {
  const files = written.map((entry) => entry.target.relative).join(", ");

  const version = await writeAndCommitAll(
    deps,
    scope.project,
    scope.direction,
    written,
    title,
    { kind: "manual", prompt: `${title}: ${files}` }
  );

  toRecordHistory(deps, scope, written, version);
  await publishVersion(deps, scope.project, scope.direction, version);

  return version;
};

const applyDivider = async (
  deps: DirectEditDeps,
  scope: DividerScope,
  request: DividerSetRequest
): Promise<DividerSetDone> => {
  assertCanEdit(deps, scope.project, scope.direction);
  const site = await toDividerSite(scope, request.target.source);

  if (site.mode !== "classes") {
    throw new DividerError(CSS_NOTE);
  }

  const variant = toVariantOf(request.variant);

  const classes = toDividerChanges(
    site.classes,
    request.paint,
    variant,
    site.colorNames
  );

  if (classes.add.length === 0 && classes.remove.length === 0) {
    throw new DividerError(SAME);
  }

  const title = toTitleOf(request.paint, variant);
  const written = await toWritten(scope, request, classes, variant);
  const version = await toCommitted(deps, scope, written, title);

  return { classes, title, version, written };
};

export { applyDivider, inspectDivider };

export type { DividerInfo, DividerSetDone, DividerSetRequest, DividerTarget };

import type { Direction, Project, SourceLoc } from "@design-studio/contracts";
import { Schema } from "effect";

import { resolveInstance } from "../components/use-site.js";
import { probeOwners, resolveSourceLoc, scopeOf } from "../page-probe/index.js";
import { EditError, loadTarget } from "./edit-guards.js";
import type { EditDeps } from "./edit-guards.js";
import { pageUrl } from "./edit-kit.js";
import { targetFor } from "./image-tools.js";
import { targetOf } from "./insert-tools.js";
import { toKind, toNested } from "./legacy-target-schema.js";
import type { TargetKind } from "./legacy-target-schema.js";

type LegacyArgs = Readonly<Record<string, Schema.Json>>;

type TargetDeps = Pick<EditDeps, "preview" | "projects">;

interface Owner {
  readonly name: string;
  readonly stack: string;
}

interface ResolvedTarget {
  readonly background?: boolean;
  readonly html?: string;
  readonly owners?: readonly Owner[];
  readonly selector?: string;
  readonly source: SourceLoc | null;
  readonly tag?: string;
}

interface LegacyScope {
  readonly args: LegacyArgs;
  readonly direction: Direction;
  readonly project: Project;
}

interface LegacyFailure {
  readonly isOk: false;
  readonly message: string;
}

interface LegacySuccess {
  readonly args: LegacyArgs;
  readonly isOk: true;
}

type LegacyOutcome = LegacyFailure | LegacySuccess;

interface ImagePick {
  page?: string;
  selector?: string;
  source?: string;
}

interface InsertPick {
  path?: string;
  targetSelector?: string;
  targetSource?: string;
}

const LEGACY_KEYS: ReadonlySet<string> = new Set([
  "path",
  "targetSelector",
  "targetSource",
]);

const OWNER_KINDS: ReadonlySet<TargetKind> = new Set(["owner", "place"]);

const PLACE_KINDS: ReadonlySet<TargetKind> = new Set(["place"]);

const NO_SOURCE =
  "The element has no source location. Pass targetSource with the file:line:col of its tag.";

const isText = Schema.is(Schema.NonEmptyString);

const toText = (args: LegacyArgs, key: string): string | null => {
  const value = args[key];

  if (isText(value)) {
    return value;
  }

  return null;
};

const toNestedArgs = (name: string, args: LegacyArgs): LegacyArgs => {
  const nested = toNested(name);

  if (nested === null || nested.key in args) {
    return args;
  }

  const fields = new Set(nested.fields);
  const moved = Object.entries(args).filter(([key]) => fields.has(key));

  if (moved.length === 0) {
    return args;
  }

  const kept = Object.entries(args).filter(([key]) => !fields.has(key));

  return Object.fromEntries([...kept, [nested.key, Object.fromEntries(moved)]]);
};

const hasLegacyTarget = (args: LegacyArgs): boolean =>
  toText(args, "targetSelector") !== null ||
  toText(args, "targetSource") !== null;

const toInsertPick = (args: LegacyArgs): InsertPick => {
  const pick: InsertPick = {};
  const page = toText(args, "path");
  const selector = toText(args, "targetSelector");
  const source = toText(args, "targetSource");

  if (page !== null) {
    pick.path = page;
  }

  if (selector !== null) {
    pick.targetSelector = selector;
  }

  if (source !== null) {
    pick.targetSource = source;
  }

  return pick;
};

const toImagePick = (args: LegacyArgs): ImagePick => {
  const pick: ImagePick = {};
  const page = toText(args, "path");
  const selector = toText(args, "targetSelector");
  const source = toText(args, "targetSource");

  if (page !== null) {
    pick.page = page;
  }

  if (selector !== null) {
    pick.selector = selector;
  }

  if (source !== null) {
    pick.source = source;
  }

  return pick;
};

const toWireSource = (source: SourceLoc): LegacyArgs =>
  Object.fromEntries([
    ["col", source.col],
    ["file", source.file],
    ["line", source.line],
  ]);

const toWireOwners = (owners: readonly Owner[]): Schema.Json =>
  owners.map((owner) => ({ name: owner.name, stack: owner.stack }));

const toOwnerEntries = (
  kind: TargetKind,
  target: ResolvedTarget
): (readonly [string, Schema.Json])[] => {
  const owners = target.owners ?? null;

  if (!OWNER_KINDS.has(kind) || owners === null) {
    return [];
  }

  return [["owners", toWireOwners(owners)]];
};

const toPlaceEntries = (
  kind: TargetKind,
  target: ResolvedTarget
): (readonly [string, Schema.Json])[] => {
  if (!PLACE_KINDS.has(kind)) {
    return [];
  }

  const entries: (readonly [string, Schema.Json])[] = [];
  const background = target.background ?? null;
  const html = target.html ?? null;

  if (background !== null) {
    entries.push(["background", background]);
  }

  if (html !== null) {
    entries.push(["html", html]);
  }

  return entries;
};

const toWireTarget = (kind: TargetKind, target: ResolvedTarget): LegacyArgs => {
  const entries: (readonly [string, Schema.Json])[] = [];
  const selector = target.selector ?? null;
  const tag = target.tag ?? null;

  if (target.source !== null) {
    entries.push(["source", toWireSource(target.source)]);
  }

  if (selector !== null) {
    entries.push(["selector", selector]);
  }

  if (tag !== null) {
    entries.push(["tag", tag]);
  }

  return Object.fromEntries([
    ...entries,
    ...toOwnerEntries(kind, target),
    ...toPlaceEntries(kind, target),
  ]);
};

const toResolvedTarget = (
  deps: TargetDeps,
  kind: TargetKind,
  scope: LegacyScope
): Promise<ResolvedTarget> => {
  const { args, direction, project } = scope;

  if (PLACE_KINDS.has(kind)) {
    return targetFor(deps, project, direction, toImagePick(args));
  }

  return targetOf(deps, project, direction, toInsertPick(args));
};

const toScope = async (
  deps: TargetDeps,
  args: LegacyArgs
): Promise<LegacyScope> => {
  const found = await loadTarget(
    deps,
    toText(args, "projectId") ?? "",
    toText(args, "directionId") ?? "main"
  );

  return { args, direction: found.direction, project: found.project };
};

const isPlaced = (kind: TargetKind, target: ResolvedTarget): boolean =>
  OWNER_KINDS.has(kind) || target.source !== null;

const toKept = (args: LegacyArgs): LegacyArgs =>
  Object.fromEntries(
    Object.entries(args).filter(([key]) => !LEGACY_KEYS.has(key))
  );

const toTargetArgs = (
  kind: TargetKind,
  args: LegacyArgs,
  target: ResolvedTarget
): LegacyArgs => {
  const kept = toKept(args);

  if (kind === "loc" && target.source !== null) {
    return Object.fromEntries([
      ...Object.entries(kept),
      ...Object.entries(toWireSource(target.source)),
    ]);
  }

  return Object.fromEntries([
    ...Object.entries(kept),
    ["target", toWireTarget(kind, target)],
  ]);
};

const toResolvedArgs = async (
  deps: TargetDeps,
  kind: TargetKind,
  args: LegacyArgs
): Promise<LegacyOutcome> => {
  try {
    const scope = await toScope(deps, args);
    const target = await toResolvedTarget(deps, kind, scope);

    if (!isPlaced(kind, target)) {
      return { isOk: false, message: NO_SOURCE };
    }

    return { args: toTargetArgs(kind, args, target), isOk: true };
  } catch (error) {
    if (error instanceof Error) {
      return { isOk: false, message: error.message };
    }

    return { isOk: false, message: String(error) };
  }
};

const NO_USE_SITE =
  "is not inside a component instance with props that the studio can find. Pass source with the file:line:col of the component's JSX tag (read_file shows it), or use edit_element for classes and text.";

const toUseSource = async (
  deps: TargetDeps,
  scope: LegacyScope
): Promise<SourceLoc> => {
  const { args, direction, project } = scope;
  const source = toText(args, "source");
  const selector = toText(args, "selector");

  if (source !== null && selector !== null) {
    throw new EditError("pass selector or source, not both");
  }

  if (source !== null) {
    return resolveSourceLoc(
      direction.workTree,
      scopeOf(project.id, direction.id),
      source
    );
  }

  if (selector === null) {
    throw new EditError("pass selector or source, not both");
  }

  const url = await pageUrl(
    deps,
    project,
    direction,
    toText(args, "path") ?? ""
  );

  const probed = await probeOwners(deps.preview, url, selector);

  if (!probed) {
    throw new EditError(`No element matches ${selector} on the page.`);
  }

  const instance = await resolveInstance(
    { previewOrigin: new URL(url).origin, workTree: direction.workTree },
    { owners: probed.owners, usedAt: probed.usedAt }
  );

  if (!instance) {
    throw new EditError(`${selector} ${NO_USE_SITE}`);
  }

  return instance.use;
};

const toUseArgs = async (
  deps: TargetDeps,
  args: LegacyArgs
): Promise<LegacyOutcome> => {
  try {
    const scope = await toScope(deps, args);
    const use = await toUseSource(deps, scope);

    const kept = Object.fromEntries(
      Object.entries(args).filter(
        ([key]) => key !== "path" && key !== "selector" && key !== "source"
      )
    );

    return {
      args: { ...kept, source: toWireSource(use) },
      isOk: true,
    };
  } catch (error) {
    if (error instanceof Error) {
      return { isOk: false, message: error.message };
    }

    return { isOk: false, message: String(error) };
  }
};

const ItemsSchema = Schema.Array(Schema.Record(Schema.String, Schema.Json));

const readItems = Schema.is(ItemsSchema);

const NO_TARGET = "pass targetSelector or targetSource, not both";

const toItemTarget = async (
  deps: TargetDeps,
  scope: LegacyScope,
  item: LegacyArgs
): Promise<LegacyArgs> => {
  const selector = toText(item, "targetSelector");
  const source = toText(item, "targetSource");

  if ((selector === null) === (source === null)) {
    throw new EditError(NO_TARGET);
  }

  const { direction, project } = scope;
  const path = toText(item, "path") ?? toText(scope.args, "path");
  const pick: InsertPick = {};

  if (path !== null) {
    pick.path = path;
  }

  if (selector !== null) {
    pick.targetSelector = selector;
  }

  if (source !== null) {
    pick.targetSource = source;
  }

  const target = await targetOf(deps, project, direction, pick);

  return toWireTarget("owner", target);
};

const toItemTargets = async (
  deps: TargetDeps,
  scope: LegacyScope,
  items: readonly LegacyArgs[]
): Promise<readonly LegacyArgs[]> => {
  const [first = null, ...rest] = items;

  if (first === null) {
    return [];
  }

  const head = await toItemTarget(deps, scope, first);

  return [head, ...(await toItemTargets(deps, scope, rest))];
};

const toListArgs = async (
  deps: TargetDeps,
  args: LegacyArgs
): Promise<LegacyOutcome> => {
  const items = args["targets"] ?? null;

  if (!readItems(items)) {
    return { args, isOk: true };
  }

  try {
    const scope = await toScope(deps, args);
    const targets = await toItemTargets(deps, scope, items);

    const kept = Object.fromEntries(
      Object.entries(args).filter(([key]) => key !== "path")
    );

    return { args: { ...kept, targets }, isOk: true };
  } catch (error) {
    if (error instanceof Error) {
      return { isOk: false, message: error.message };
    }

    return { isOk: false, message: String(error) };
  }
};

const hasUseTarget = (args: LegacyArgs): boolean =>
  toText(args, "selector") !== null || toText(args, "source") !== null;

const toLegacyTargetArgs = (
  deps: TargetDeps,
  name: string,
  args: LegacyArgs
): Promise<LegacyOutcome> => {
  const nested = toNestedArgs(name, args);
  const kind = toKind(name);

  if (kind === "list") {
    return toListArgs(deps, nested);
  }

  if (kind === "use") {
    if (!hasUseTarget(nested)) {
      return Promise.resolve({ args: nested, isOk: true });
    }

    return toUseArgs(deps, nested);
  }

  if (kind === null || !hasLegacyTarget(nested)) {
    return Promise.resolve({ args: nested, isOk: true });
  }

  return toResolvedArgs(deps, kind, nested);
};

export { toLegacyTargetArgs };

export type { LegacyOutcome, TargetDeps };

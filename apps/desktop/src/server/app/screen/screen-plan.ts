import { readFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestError, ConflictError } from "../../platform/errors/index.js";
import {
  toComponentName,
  toFramePath,
  toPageSource,
  toRoutePath,
  toScreenSegments,
  toTitleCase,
} from "./engine/index.js";
import { toHtmlCreatePlan, toHtmlInspect } from "./screen-html.js";
import type {
  CreateScreenCommand,
  InspectScope,
  ScreenPlan,
  ScreenScope,
  ScreenWritePlan,
} from "./screen-model.js";
import { getSavedParams } from "./screen-params.js";
import {
  getGroupPlacement,
  isPathTaken,
  listLayoutGroups,
  toGroupRouteCount,
  toPosix,
} from "./screen-source.js";
import type { GroupScan, Placement } from "./screen-source.js";

interface PickedGroup {
  readonly name: string;
  readonly placement: Placement;
}

const GROUP_ROUTE = /^\(.*\)$/u;

const toSegmentsOrThrow = (raw: string): readonly string[] => {
  const parsed = toScreenSegments(raw);

  if (!parsed.isOk) {
    throw new BadRequestError(parsed.message);
  }

  return parsed.segments;
};

const toPageExtension = (file: string | null): "jsx" | "tsx" => {
  if (file !== null && /\.(?:jsx|js)$/u.test(file)) {
    return "jsx";
  }

  return "tsx";
};

const toDepth = (placement: Placement, segments: readonly string[]): number =>
  segments.length - placement.rest.length;

const getPickedGroup = async (
  scan: GroupScan,
  segments: readonly string[]
): Promise<PickedGroup> => {
  const placed = await Promise.all(
    scan.groups.map(async (group) => ({
      hasShell: group.layoutFile !== null && group.sampleRoutes.length > 0,
      name: group.name,
      placement: await getGroupPlacement(scan.context, group.name, segments),
      routeCount: toGroupRouteCount(scan.context, group.name),
    }))
  );

  const ordered = placed.toSorted(
    (left, right) =>
      toDepth(right.placement, segments) - toDepth(left.placement, segments) ||
      Number(right.hasShell) - Number(left.hasShell) ||
      right.routeCount - left.routeCount
  );

  const best = ordered.at(0) ?? null;

  if (best === null) {
    throw new BadRequestError("The app has no layout group.");
  }

  return { name: best.name, placement: best.placement };
};

const toFileRelative = (
  scan: GroupScan,
  placement: Placement,
  extension: string
): string => {
  const folder = path.join(placement.folder, ...placement.rest);

  return toPosix(
    path.relative(scan.context.workTree, path.join(folder, `page.${extension}`))
  );
};

const toSampleExtension = (scan: GroupScan, name: string): "jsx" | "tsx" =>
  toPageExtension(scan.samples.get(name)?.at(0)?.file ?? null);

const toInspectPlan = async (
  scope: InspectScope,
  raw: string
): Promise<ScreenPlan> => {
  if (!scope.project.app) {
    return toHtmlInspect(scope, raw);
  }

  const segments = toSegmentsOrThrow(raw);
  const scan = await listLayoutGroups(scope, segments);
  const picked = await getPickedGroup(scan, segments);
  const taken = await isPathTaken(scan.context, segments, picked.placement);
  const extension = toSampleExtension(scan, picked.name);

  return {
    filePath: toFileRelative(scan, picked.placement, extension),
    groups: scan.groups,
    isPathFree: !taken,
  };
};

const toCanonicalRoute = (routerDir: string, folder: string): string => {
  const relative = toPosix(path.relative(routerDir, folder));

  const parts = relative
    .split("/")
    .filter((part) => part !== "" && !GROUP_ROUTE.test(part));

  return toRoutePath(parts);
};

const toGroupName = async (
  scan: GroupScan,
  group: string | null,
  segments: readonly string[]
): Promise<string> => {
  if (group === null) {
    const picked = await getPickedGroup(scan, segments);

    return picked.name;
  }

  if (!scan.groups.some((item) => item.name === group)) {
    const names = scan.groups.map((item) => item.name).join(", ");

    throw new BadRequestError(
      `No layout group ${group}. Groups: ${names}. Call inspect_screen for the groups.`
    );
  }

  return group;
};

const toLastTitle = (segments: readonly string[]): string => {
  const last = segments.findLast((segment) => !segment.startsWith("["));

  return toTitleCase(last ?? "Screen");
};

const toRollbackRoot = (
  workTree: string,
  placement: Placement
): string | null => {
  const first = placement.rest.at(0) ?? null;

  if (first === null) {
    return null;
  }

  return toPosix(path.relative(workTree, path.join(placement.folder, first)));
};

const getSampleCode = (
  scan: GroupScan,
  file: string | null
): Promise<string> => {
  if (file === null) {
    return Promise.resolve("");
  }

  return readFile(path.join(scan.context.workTree, file), "utf-8");
};

const toCreatePlan = async (
  scope: ScreenScope,
  command: CreateScreenCommand
): Promise<ScreenWritePlan> => {
  if (!scope.project.app) {
    return toHtmlCreatePlan(scope, command);
  }

  const segments = toSegmentsOrThrow(command.path);
  const scan = await listLayoutGroups(scope, segments);
  const name = await toGroupName(scan, command.group, segments);
  const placement = await getGroupPlacement(scan.context, name, segments);

  if (await isPathTaken(scan.context, segments, placement)) {
    throw new ConflictError(
      `The route ${toRoutePath(segments)} exists already. Pick another path.`
    );
  }

  const sample = scan.samples.get(name)?.at(0) ?? null;
  const file = toFileRelative(scan, placement, toSampleExtension(scan, name));
  const title = command.title.trim() || toLastTitle(segments);

  const sampleCode = await getSampleCode(scan, sample?.file ?? null);
  const componentName = toComponentName(segments);
  const fromDir = path.posix.dirname(sample?.file ?? file);
  const toDir = path.posix.dirname(file);
  const { layout } = command;

  const code = toPageSource({
    componentName,
    fromDir,
    layout,
    sampleCode,
    title,
    toDir,
  });

  const params = await getSavedParams(scope.projectDir);
  const folder = path.join(placement.folder, ...placement.rest);

  return {
    files: [{ code, relative: file }],
    framePath: toFramePath(segments, params),
    label: title,
    rightOfPath: null,
    rollbackRoot: toRollbackRoot(scan.context.workTree, placement),
    route: toCanonicalRoute(scan.context.routerDir, folder),
    versionTitle: `Create screen ${toRoutePath(segments)}`,
  };
};

export {
  toCanonicalRoute,
  toCreatePlan,
  toInspectPlan,
  toLastTitle,
  toRollbackRoot,
  toSegmentsOrThrow,
};

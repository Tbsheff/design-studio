import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Project } from "@design-studio/contracts";

import { listPortKitFinds } from "../components/kit-drift/index.js";
import type { PortKitFind } from "../components/kit-drift/index.js";
import { listRouteFolderFiles } from "./port-route-folder.js";

interface KitRouteScope {
  readonly files: readonly string[];
  readonly project: Project;
  readonly routePath: string | null;
  readonly workTree: string;
}

interface KitCount {
  readonly found: number | null;
  readonly left: number | null;
}

const KIT_LINES_MAX = 6;

const GROUP_SEGMENT = /^\(.*\)$/u;

const APP_SEGMENT = "app";

const LIST_TOOL = "list_kit_drift";

const APPLY_TOOL = "apply_kit_drift";

const LOOK_SIGNALS: ReadonlyMap<string, string> = new Map([
  ["badge", "radius, fill or border, side padding, small text"],
  ["card", "border, radius, background, padding"],
]);

const toSegments = (route: string): string[] =>
  route
    .split("/")
    .filter((segment) => segment !== "" && !GROUP_SEGMENT.test(segment));

const isRouteFile = (file: string, routePath: string): boolean => {
  const folder = toSegments(path.posix.dirname(file));
  const route = toSegments(routePath);
  const start = folder.length - route.length;

  if (start < 1 || folder[start - 1] !== APP_SEGMENT) {
    return false;
  }

  return route.every((segment, index) => folder[start + index] === segment);
};

const toPageFiles = (scope: KitRouteScope): readonly string[] => {
  const { routePath } = scope;

  if (routePath === null) {
    return scope.files;
  }

  const own = scope.files.filter((file) => isRouteFile(file, routePath));

  if (own.length === 0) {
    return scope.files;
  }

  return own;
};

const listFolderFiles = async (
  workTree: string,
  page: string
): Promise<string[]> => {
  try {
    const text = await readFile(path.join(workTree, page), "utf-8");
    const folder = await listRouteFolderFiles(workTree, page, text);

    return folder.map((entry) => entry.file);
  } catch {
    return [];
  }
};

const listScanFiles = async (scope: KitRouteScope): Promise<string[]> => {
  const pages = toPageFiles(scope);

  const folders = await Promise.all(
    pages.map((page) => listFolderFiles(scope.workTree, page))
  );

  return [...new Set([...pages, ...folders.flat()])];
};

const inspectRouteKit = async (
  scope: KitRouteScope
): Promise<readonly PortKitFind[] | null> =>
  listPortKitFinds(
    { project: scope.project, workTree: scope.workTree },
    await listScanFiles(scope)
  );

const hasKitGap = (finds: readonly PortKitFind[] | null): boolean =>
  (finds ?? []).some((find) => find.isHigh);

const toUseText = (find: PortKitFind): string => {
  if (find.importPath === "") {
    return `Use ${find.component} from the app kit.`;
  }

  return `Use ${find.component} from ${find.importPath}.`;
};

const toSwapText = (find: PortKitFind): string => {
  if (find.id === null) {
    return " Swap it by hand with Edit.";
  }

  return ` Swap it with ${APPLY_TOOL} (id ${find.id}).`;
};

const toRawText = (find: PortKitFind): string => {
  if (find.tag === "a-as-button") {
    return "has a link with button classes";
  }

  return `has a raw <${find.tag}> with ${find.tag} classes`;
};

const toMediumText = (find: PortKitFind): string => {
  if (find.isHigh) {
    return "";
  }

  return " Check it first: the match is medium.";
};

const toKitLine = (find: PortKitFind): string => {
  const head = `- Kit: ${find.file} line ${find.line}`;
  const signals = LOOK_SIGNALS.get(find.tag) ?? null;

  if (signals !== null) {
    return `${head} is a hand-made ${find.tag} (${signals}). ${toUseText(find)}`;
  }

  return `${head} ${toRawText(find)}. ${toUseText(find)}${toSwapText(find)}${toMediumText(find)}`;
};

const toKitLines = (finds: readonly PortKitFind[] | null): string[] => {
  const all = finds ?? [];
  const shown = all.slice(0, KIT_LINES_MAX);
  const lines = shown.map((find) => toKitLine(find));

  if (all.length > shown.length) {
    lines.push(
      `- Kit: ${all.length - shown.length} more raw elements. Call ${LIST_TOOL} with the page to see them.`
    );
  }

  return lines;
};

const toElementsText = (count: number): string => {
  if (count === 1) {
    return "1 raw element";
  }

  return `${count} raw elements`;
};

const toKitNote = (count: KitCount): string => {
  if (count.found === null) {
    return "";
  }

  if (count.found === 0) {
    return " Kit: 0 raw elements found.";
  }

  return ` Kit: ${toElementsText(count.found)} found, ${count.left ?? count.found} left.`;
};

export { hasKitGap, inspectRouteKit, toKitLines, toKitNote };

export type { KitCount, KitRouteScope };

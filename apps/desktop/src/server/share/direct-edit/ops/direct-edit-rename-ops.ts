import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  DirectEditRequest,
  Direction,
  Project,
  SourceLoc,
} from "@design-studio/contracts";

import { applyDirectEditBatch } from "../../../direct-edit/index.js";
import type { DirectEditRuntime } from "../../../direct-edit/index.js";
import {
  EditError,
  LayerRefError,
  describeElements,
  isLayerRef,
  memoPage,
  resolveLayerRefs,
  resolveSourceLoc,
  scopeOf,
  toProbeTarget,
} from "../../../page-probe/index.js";
import { NotFoundError } from "../../../platform/errors/index.js";
import { withPagePath } from "../../../project-source/index.js";
import type { DirectionRef } from "./direct-edit-ops.js";

interface RenameEntry {
  readonly name: string | null;
  readonly selector: string;
}

interface RenameBody {
  readonly layers: readonly RenameEntry[];
  readonly path: string;
}

interface RenameSkip {
  readonly reason: string;
  readonly selector: string;
}

interface RenameOutcome {
  readonly renamed: number;
  readonly skipped: readonly RenameSkip[];
  readonly versionId: string | null;
}

interface Located {
  readonly entry: RenameEntry;
  readonly source: SourceLoc | null;
  readonly reason: string | null;
  readonly tag: string;
}

interface RenameScope {
  readonly direction: Direction;
  readonly project: Project;
  readonly runtime: DirectEditRuntime;
  readonly url: string;
}

const PROBE_VIEWPORT = { height: 900, width: 1440 } as const;
const SOURCE_LOC = /^.+:\d+:\d+$/u;
const TAG_AT = /^<(?<tag>[A-Za-z][\w.:-]*)/u;

const isSourceLoc = (selector: string): boolean =>
  SOURCE_LOC.test(selector.trim()) && !selector.includes(" ");

const toMiss = (layer: RenameEntry, why: string): Located => ({
  entry: layer,
  reason: why,
  source: null,
  tag: "",
});

const toFound = (
  layer: RenameEntry,
  loc: SourceLoc,
  tagName: string
): Located => ({ entry: layer, reason: null, source: loc, tag: tagName });

const toOffset = (code: string, loc: SourceLoc): number => {
  let offset = 0;

  for (let at = 1; at < loc.line; at += 1) {
    const next = code.indexOf("\n", offset);

    if (next === -1) {
      return -1;
    }

    offset = next + 1;
  }

  return offset + Math.max(0, loc.col - 1);
};

const isInsideTree = (workTree: string, file: string): boolean =>
  !path.isAbsolute(file) &&
  !file.split(/[\\/]/u).includes("..") &&
  path.resolve(workTree, file).startsWith(workTree + path.sep);

const toTagAt = async (
  workTree: string,
  loc: SourceLoc
): Promise<string | null> => {
  const code = await readFile(path.resolve(workTree, loc.file), "utf-8");
  const offset = toOffset(code, loc);

  if (offset < 0) {
    return null;
  }

  return TAG_AT.exec(code.slice(offset))?.groups?.tag ?? null;
};

const toLocatedSource = async (
  scope: RenameScope,
  entry: RenameEntry
): Promise<Located> => {
  const key = scopeOf(scope.project.id, scope.direction.id);

  try {
    const loc = await resolveSourceLoc(
      scope.direction.workTree,
      key,
      entry.selector
    );

    if (!isInsideTree(scope.direction.workTree, loc.file)) {
      return toMiss(entry, `${loc.file} is not a file in the project.`);
    }

    const tag = await toTagAt(scope.direction.workTree, loc);

    if (tag === null) {
      return toMiss(entry, `No tag starts at ${entry.selector}.`);
    }

    return toFound(entry, loc, tag);
  } catch (error) {
    if (error instanceof EditError) {
      return toMiss(entry, error.message);
    }

    return toMiss(entry, `There is no file for ${entry.selector}.`);
  }
};

const toRefPaths = async (
  scope: RenameScope,
  refs: readonly string[]
): Promise<Map<string, string>> => {
  if (refs.length === 0) {
    return new Map();
  }

  const target = toProbeTarget(
    scope.runtime.preview,
    scope.url,
    PROBE_VIEWPORT,
    scopeOf(scope.project.id, scope.direction.id)
  );

  try {
    return await resolveLayerRefs(target, [...refs]);
  } catch (error) {
    if (!(error instanceof LayerRefError)) {
      throw error;
    }
  }

  const paths = await Promise.all(
    refs.map(async (ref) => {
      try {
        return [...(await resolveLayerRefs(target, [ref]))];
      } catch (error) {
        if (error instanceof LayerRefError) {
          return [];
        }

        throw error;
      }
    })
  );

  return new Map(paths.flat());
};

const toContexts = (
  scope: RenameScope,
  selectors: string[]
): ReturnType<typeof describeElements> => {
  if (selectors.length === 0) {
    return Promise.resolve([]);
  }

  return describeElements(scope.runtime.preview, scope.url, selectors);
};

const toLocatedOnPage = async (
  scope: RenameScope,
  entries: readonly RenameEntry[]
): Promise<Located[]> => {
  const refs = entries.flatMap((entry) => {
    if (isLayerRef(entry.selector)) {
      return [entry.selector.trim()];
    }

    return [];
  });

  const paths = await toRefPaths(scope, refs);

  const selectors = entries.map((entry) => {
    if (isLayerRef(entry.selector)) {
      return paths.get(entry.selector.trim()) ?? "";
    }

    return entry.selector;
  });

  const known = [...new Set(selectors.filter((selector) => selector !== ""))];
  const contexts = await toContexts(scope, known);

  const byPath = new Map(
    known.map((selector, index) => [selector, contexts[index] ?? null])
  );

  return entries.map((entry, index) => {
    const selector = selectors[index] ?? "";
    const context = byPath.get(selector) ?? null;

    if (selector === "") {
      return toMiss(
        entry,
        `Layer ${entry.selector} is not on the page. Call get_layers for current ids.`
      );
    }

    if (context === null) {
      return toMiss(entry, `No element matches ${entry.selector} on the page.`);
    }

    if (context.source === null) {
      return toMiss(entry, `${entry.selector} has no source location.`);
    }

    return toFound(entry, context.source, context.tag);
  });
};

const toPageUrl = async (
  runtime: DirectEditRuntime,
  loaded: { readonly direction: Direction; readonly project: Project },
  body: RenameBody
): Promise<string> => {
  const base = await runtime.preview.directionUrl(
    loaded.project,
    loaded.direction
  );

  const key = scopeOf(loaded.project.id, loaded.direction.id);
  const ref = body.layers.find((entry) => isLayerRef(entry.selector));
  let page = body.path.trim();

  if (page === "" && ref) {
    page = memoPage(key, ref.selector.trim()) ?? "";
  }

  if (page === "") {
    return withPagePath(base);
  }

  return withPagePath(base, page);
};

const toLocated = async (
  scope: RenameScope,
  layers: readonly RenameEntry[]
): Promise<Located[]> => {
  const onPage = layers.filter((entry) => !isSourceLoc(entry.selector));

  const [fromPage, fromSource] = await Promise.all([
    toLocatedOnPage(scope, onPage),
    Promise.all(
      layers.flatMap((entry) => {
        if (isSourceLoc(entry.selector)) {
          return [toLocatedSource(scope, entry)];
        }

        return [];
      })
    ),
  ]);

  const byEntry = new Map(
    [...fromPage, ...fromSource].map((located) => [located.entry, located])
  );

  return layers.flatMap((entry) => {
    const located = byEntry.get(entry);

    if (located) {
      return [located];
    }

    return [];
  });
};

const toLocKey = (source: SourceLoc): string =>
  `${source.file}:${source.line}:${source.col}`;

const toRenameName = (name: string | null): string | null => {
  const trimmed = name?.trim() ?? "";

  if (trimmed === "") {
    return null;
  }

  return trimmed;
};

interface RenameRequests {
  readonly requests: DirectEditRequest[];
  readonly skipped: RenameSkip[];
}

const toSkip = (
  item: Located,
  seen: ReadonlySet<string>
): RenameSkip | null => {
  const { entry, source } = item;

  if (source === null) {
    return { reason: item.reason ?? "", selector: entry.selector };
  }

  const key = toLocKey(source);

  if (seen.has(key)) {
    return {
      reason: `Another layer in this call has the same source ${key}.`,
      selector: entry.selector,
    };
  }

  return null;
};

const toRequests = (located: readonly Located[]): RenameRequests => {
  const seen = new Set<string>();
  const requests: DirectEditRequest[] = [];
  const skipped: RenameSkip[] = [];

  for (const item of located) {
    const skip = toSkip(item, seen);

    if (skip !== null || item.source === null) {
      skipped.push(skip ?? { reason: "", selector: item.entry.selector });
    } else {
      seen.add(toLocKey(item.source));
      requests.push({
        name: toRenameName(item.entry.name),
        selector: item.entry.selector,
        source: item.source,
        tag: item.tag,
      });
    }
  }

  return { requests, skipped };
};

const renameLayersIn = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: RenameBody
): Promise<RenameOutcome> => {
  const loaded = await runtime.loadDirection(ref.projectId, ref.directionId);
  const url = await toPageUrl(runtime, loaded, body);
  const located = await toLocated({ ...loaded, runtime, url }, body.layers);
  const { requests, skipped } = toRequests(located);

  if (requests.length === 0) {
    throw new NotFoundError(
      `No layer was renamed. ${skipped.map((skip) => skip.reason).join(" ")}`
    );
  }

  const result = await runtime.withDirection(
    ref.projectId,
    ref.directionId,
    (project, direction) =>
      applyDirectEditBatch(runtime.editDeps, project, direction, {
        edits: requests,
      })
  );

  return {
    renamed: requests.length,
    skipped: [...skipped],
    versionId: result.version.id,
  };
};

export { renameLayersIn };

export type { RenameBody, RenameOutcome };

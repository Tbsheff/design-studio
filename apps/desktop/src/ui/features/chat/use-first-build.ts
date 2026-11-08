import type { ProjectKind } from "@design-studio/contracts";
import { useCallback, useEffect, useState, startTransition } from "react";

import { api } from "../../api.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { PREVIEW_PAINTED_EVENT } from "../inspector/use-edit-history.js";

const TREE_CAP = 3000;
const PAINT_FALLBACK_MS = 5000;

const pageFileOf = (path: string | undefined): string => {
  const clean = (path ?? "").split(/[?#]/u)[0]?.replace(/^\/+/u, "") ?? "";

  if (!clean) {
    return "index.html";
  }

  if (clean.endsWith("/")) {
    return `${clean}index.html`;
  }

  return clean;
};

const UNLISTED = /^(?:\.|node_modules\/|dist\/|\.vite\/|vite-cache\/)|\/\./u;

const hasPage = (files: ReadonlySet<string>, file: string): boolean =>
  files.has(file) || files.has(`${file}/index.html`);

type PageWait = "building" | "missing" | null;

interface Options {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  live: boolean;
  building: boolean;
  lastChange: FilesChange | null;
}

type TreeFiles = ReadonlySet<string> | "all";

interface LoadedTree {
  readonly files: TreeFiles;
  readonly key: string;
  readonly stamp: string;
}

const toChangeAt = (options: Options): number | null => {
  if (options.lastChange?.directionId === options.directionId) {
    return options.lastChange?.changedAt ?? null;
  }

  return null;
};

const useWorkTreeFiles = (
  options: Options,
  isGated: boolean
): TreeFiles | null => {
  const { projectId, directionId, building } = options;
  const changeAt = toChangeAt(options);
  const key = `${isGated}|${projectId}|${directionId}`;
  const stamp = `${changeAt}|${building}`;
  const [loaded, setLoaded] = useState<LoadedTree | null>(null);

  useEffect(() => {
    if (!isGated || !directionId) {
      return;
    }

    let alive = true;
    startTransition(async () => {
      let files: TreeFiles = "all";

      try {
        const tree = await api.workTreeFiles(projectId, directionId);

        if (tree.files.length < TREE_CAP) {
          files = new Set(tree.files);
        }
      } catch {
        files = "all";
      }

      if (alive) {
        setLoaded({ files, key, stamp });
      }
    });

    return (): void => {
      alive = false;
    };
  }, [isGated, projectId, directionId, key, stamp]);

  if (loaded?.key === key) {
    return loaded.files;
  }

  return null;
};

const toPageWait = (
  files: ReadonlySet<string> | null,
  file: string,
  building: boolean
): PageWait => {
  if (building && (files === null || !hasPage(files, file))) {
    return "building";
  }

  if (files === null || hasPage(files, file)) {
    return null;
  }

  return "missing";
};

const usePageFiles = (
  options: Options
): ((path: string | undefined) => PageWait) => {
  const isGated =
    options.live && options.kind === "html" && options.directionId !== null;

  const files = useWorkTreeFiles(options, isGated);
  const { building } = options;

  return useCallback(
    (path: string | undefined) => {
      const file = pageFileOf(path);

      if (!isGated || files === "all" || UNLISTED.test(file)) {
        return null;
      }

      return toPageWait(files, file, building);
    },
    [isGated, files, building]
  );
};

const useFramePainted = (waiting: boolean, mounted: boolean): boolean => {
  const [painted, setPainted] = useState(false);
  const phase = `${waiting}|${mounted}`;
  const [seen, setSeen] = useState(phase);

  if (seen !== phase) {
    setSeen(phase);

    if (waiting) {
      setPainted(false);
    }
  }

  useEffect(() => {
    if (!waiting || !mounted) {
      return;
    }

    const done = (): void => setPainted(true);
    globalThis.addEventListener(PREVIEW_PAINTED_EVENT, done);
    const timer = globalThis.setTimeout(done, PAINT_FALLBACK_MS);

    return (): void => {
      globalThis.removeEventListener(PREVIEW_PAINTED_EVENT, done);
      globalThis.clearTimeout(timer);
    };
  }, [waiting, mounted]);

  return !waiting || painted;
};

interface GateOptions {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  live: boolean;
  running: boolean | undefined;
  hasHead: boolean;
  urlError: string | null;
  lastChange: FilesChange | null;
  path: string | undefined;
  emptyStage: boolean;
  url: string | null;
}

interface FirstBuildGate {
  building: boolean;
  wait: PageWait;
  url: string | null;
  waitFor: (path: string | undefined, directionId: string | null) => PageWait;
}

const toGateUrl = (wait: PageWait, options: GateOptions): string | null => {
  if (wait || options.emptyStage) {
    return null;
  }

  return options.url;
};

const useFirstBuildGate = (options: GateOptions): FirstBuildGate => {
  const building =
    options.live &&
    options.running === true &&
    !options.hasHead &&
    !options.urlError;

  const pageWait = usePageFiles({
    building,
    directionId: options.directionId,
    kind: options.kind,
    lastChange: options.lastChange,
    live: options.live,
    projectId: options.projectId,
  });

  const wait = pageWait(options.path);
  const own = options.directionId;

  const waitFor = useCallback(
    (path: string | undefined, directionId: string | null) => {
      if (directionId === own) {
        return pageWait(path);
      }

      return null;
    },
    [own, pageWait]
  );

  const url = toGateUrl(wait, options);

  return { building, url, wait, waitFor };
};

const useFirstBuildCover = (gate: FirstBuildGate, slots: number): boolean => {
  const painted = useFramePainted(
    gate.building,
    gate.url !== null && slots > 0
  );

  return gate.building && !painted;
};

export {
  pageFileOf,
  useFirstBuildCover,
  useFirstBuildGate,
  useFramePainted,
  usePageFiles,
};

export type { FirstBuildGate, PageWait };

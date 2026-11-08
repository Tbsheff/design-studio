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

const UNLISTED = /^(\.|node_modules\/|dist\/|\.vite\/|vite-cache\/)|\/\./u;

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

const usePageFiles = (
  options: Options
): ((path: string | undefined) => PageWait) => {
  const gated =
    options.live && options.kind === "html" && options.directionId !== null;
  const [files, setFiles] = useState<ReadonlySet<string> | "all" | null>(null);

  const changeAt =
    options.lastChange?.directionId === options.directionId
      ? options.lastChange?.changedAt
      : undefined;

  useEffect(() => {
    setFiles(null);
  }, [gated, options.projectId, options.directionId]);
  useEffect(() => {
    if (!gated || !options.directionId) {
      return;
    }

    let alive = true;
    const { directionId } = options;
    startTransition(async () => {
      try {
        const { files: list } = await api.workTreeFiles(
          options.projectId,
          directionId
        );

        if (alive) {
          setFiles(list.length >= TREE_CAP ? "all" : new Set(list));
        }
      } catch {
        if (alive) {
          setFiles("all");
        }
      }
    });

    return (): void => {
      alive = false;
    };
  }, [
    gated,
    options.projectId,
    options.directionId,
    changeAt,
    options.building,
  ]);
  const { building } = options;

  return useCallback(
    (path: string | undefined) => {
      const file = pageFileOf(path);

      if (!gated || files === "all" || UNLISTED.test(file)) {
        return null;
      }

      if (files === null) {
        if (building) {
          return "building";
        }
        return null;
      }

      if (hasPage(files, file)) {
        return null;
      }

      if (building) {
        return "building";
      }
      return "missing";
    },
    [gated, files, building]
  );
};

const useFramePainted = (waiting: boolean, mounted: boolean): boolean => {
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    if (!waiting) {
      return;
    }

    setPainted(false);

    if (!mounted) {
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

  return {
    building,
    url: wait || options.emptyStage ? null : options.url,
    wait,
    waitFor,
  };
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

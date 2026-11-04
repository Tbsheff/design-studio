import { useCallback, useEffect, useState } from "react";

import type { ProjectKind } from "@design-studio/actions/_core/contracts";
import { api } from "../../api.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { PREVIEW_PAINTED_EVENT } from "../inspector/use-edit-history.js";

const TREE_CAP = 3000;
const PAINT_FALLBACK_MS = 5000;

export const pageFileOf = (path: string | undefined): string => {
  const clean = (path ?? "").split(/[?#]/u)[0]?.replace(/^\/+/u, "") ?? "";

  if (!clean) {
    return "index.html";
  }

  return clean.endsWith("/") ? `${clean}index.html` : clean;
};

const UNLISTED = /^(\.|node_modules\/|dist\/|\.vite\/|vite-cache\/)|\/\./u;

const hasPage = (files: ReadonlySet<string>, file: string): boolean =>
  files.has(file) || files.has(`${file}/index.html`);

export type PageWait = "building" | "missing" | null;

interface Options {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  live: boolean;
  building: boolean;
  lastChange: FilesChange | null;
}

export const usePageFiles = (
  o: Options
): ((path: string | undefined) => PageWait) => {
  const gated = o.live && o.kind === "html" && o.directionId !== null;
  const [files, setFiles] = useState<ReadonlySet<string> | "all" | null>(null);

  const changeAt =
    o.lastChange?.directionId === o.directionId
      ? o.lastChange?.changedAt
      : undefined;

  useEffect(() => {
    setFiles(null);
  }, [gated, o.projectId, o.directionId]);
  useEffect(() => {
    if (!gated || !o.directionId) {
      return;
    }

    let alive = true;
    api
      .workTreeFiles(o.projectId, o.directionId)
      .then(
        ({ files: list }) =>
          alive && setFiles(list.length >= TREE_CAP ? "all" : new Set(list))
      )
      .catch(() => alive && setFiles("all"));

    return () => {
      alive = false;
    };
  }, [gated, o.projectId, o.directionId, changeAt, o.building]);
  const { building } = o;

  return useCallback(
    (path: string | undefined) => {
      const file = pageFileOf(path);

      if (!gated || files === "all" || UNLISTED.test(file)) {
        return null;
      }

      if (files === null) {
        return building ? "building" : null;
      }

      if (hasPage(files, file)) {
        return null;
      }

      return building ? "building" : "missing";
    },
    [gated, files, building]
  );
};

export const useFramePainted = (
  waiting: boolean,
  mounted: boolean
): boolean => {
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    if (!waiting) {
      return;
    }

    setPainted(false);

    if (!mounted) {
      return;
    }

    const done = () => setPainted(true);
    globalThis.addEventListener(PREVIEW_PAINTED_EVENT, done);
    const timer = globalThis.setTimeout(done, PAINT_FALLBACK_MS);

    return () => {
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

export interface FirstBuildGate {
  building: boolean;
  wait: PageWait;
  url: string | null;
  waitFor: (path: string | undefined, directionId: string | null) => PageWait;
}

export const useFirstBuildGate = (o: GateOptions): FirstBuildGate => {
  const building = o.live && o.running === true && !o.hasHead && !o.urlError;

  const pageWait = usePageFiles({
    building,
    directionId: o.directionId,
    kind: o.kind,
    lastChange: o.lastChange,
    live: o.live,
    projectId: o.projectId,
  });

  const wait = pageWait(o.path);
  const own = o.directionId;

  const waitFor = useCallback(
    (path: string | undefined, directionId: string | null) =>
      directionId === own ? pageWait(path) : null,
    [own, pageWait]
  );

  return { building, url: wait || o.emptyStage ? null : o.url, wait, waitFor };
};

export const useFirstBuildCover = (
  gate: FirstBuildGate,
  slots: number
): boolean => {
  const painted = useFramePainted(
    gate.building,
    gate.url !== null && slots > 0
  );

  return gate.building && !painted;
};

import { useCallback, useEffect, useState } from 'react';
import type { ProjectKind } from '../shared/contracts';
import { api } from './api';
import { PREVIEW_PAINTED_EVENT } from './useEditHistory';
import type { FilesChange } from './useStudioData';

const TREE_CAP = 3000;
const PAINT_FALLBACK_MS = 5000;

export function pageFileOf(path: string | undefined): string {
  const clean = (path ?? '').split(/[?#]/)[0]?.replace(/^\/+/, '') ?? '';
  if (!clean) return 'index.html';
  return clean.endsWith('/') ? `${clean}index.html` : clean;
}

const UNLISTED = /^(\.|node_modules\/|dist\/|\.vite\/|vite-cache\/)|\/\./;

function hasPage(files: ReadonlySet<string>, file: string): boolean {
  return files.has(file) || files.has(`${file}/index.html`);
}

export type PageWait = 'building' | 'missing' | null;

interface Options {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  live: boolean;
  building: boolean;
  lastChange: FilesChange | null;
}

export function usePageFiles(o: Options): (path: string | undefined) => PageWait {
  const gated = o.live && o.kind === 'html' && o.directionId !== null;
  const [files, setFiles] = useState<ReadonlySet<string> | 'all' | null>(null);
  const changeAt = o.lastChange?.directionId === o.directionId ? o.lastChange?.changedAt : undefined;
  useEffect(() => {
    setFiles(null);
  }, [gated, o.projectId, o.directionId]);
  useEffect(() => {
    if (!gated || !o.directionId) return;
    let alive = true;
    api
      .workTreeFiles(o.projectId, o.directionId)
      .then(({ files: list }) => alive && setFiles(list.length >= TREE_CAP ? 'all' : new Set(list)))
      .catch(() => alive && setFiles('all'));
    return () => {
      alive = false;
    };
  }, [gated, o.projectId, o.directionId, changeAt, o.building]);
  const building = o.building;
  return useCallback(
    (path: string | undefined) => {
      const file = pageFileOf(path);
      if (!gated || files === 'all' || UNLISTED.test(file)) return null;
      if (files === null) return building ? 'building' : null;
      if (hasPage(files, file)) return null;
      return building ? 'building' : 'missing';
    },
    [gated, files, building],
  );
}

export function useFramePainted(waiting: boolean, mounted: boolean): boolean {
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    setPainted(false);
    if (!mounted) return;
    const done = () => setPainted(true);
    window.addEventListener(PREVIEW_PAINTED_EVENT, done);
    const timer = window.setTimeout(done, PAINT_FALLBACK_MS);
    return () => {
      window.removeEventListener(PREVIEW_PAINTED_EVENT, done);
      window.clearTimeout(timer);
    };
  }, [waiting, mounted]);
  return !waiting || painted;
}

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

export function useFirstBuildGate(o: GateOptions): FirstBuildGate {
  const building = o.live && o.running === true && !o.hasHead && !o.urlError;
  const pageWait = usePageFiles({ projectId: o.projectId, directionId: o.directionId, kind: o.kind, live: o.live, building, lastChange: o.lastChange });
  const wait = pageWait(o.path);
  const own = o.directionId;
  const waitFor = useCallback((path: string | undefined, directionId: string | null) => (directionId === own ? pageWait(path) : null), [own, pageWait]);
  return { building, wait, url: wait || o.emptyStage ? null : o.url, waitFor };
}

export function useFirstBuildCover(gate: FirstBuildGate, slots: number): boolean {
  const painted = useFramePainted(gate.building, gate.url !== null && slots > 0);
  return gate.building && !painted;
}

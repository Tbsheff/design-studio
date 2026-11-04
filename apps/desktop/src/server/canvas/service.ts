import { createHash } from "node:crypto";
import { readFile, rename } from "node:fs/promises";
import path from "node:path";

import {
  CANVAS_FILE,
  emptyCanvasFile,
  parseCanvasText,
  serializeCanvasFile,
} from "@design-studio/actions/_core/canvas-file";
import type { CanvasFile } from "@design-studio/actions/_core/canvas-file";
import type {
  CanvasPresence,
  CanvasWriteSource,
  Direction,
  LegacyCanvasNotice,
  Project,
} from "@design-studio/actions/_core/contracts";
import type { LinksFile } from "@design-studio/actions/_core/links";
import { writeAtomic as platformWriteAtomic } from "../platform/atomic-write/index.js";
import { ConflictError } from "../platform/errors/index.js";
import { createKeyedMutex } from "../platform/mutex/index.js";
import type { EventBus } from "../types.js";
import type { LayoutListener } from "./layout-history.js";

export interface LinksService {
  read: (project: Project) => Promise<LinksFile>;
  update: (
    project: Project,
    change: (file: LinksFile) => LinksFile | null,
    source: CanvasWriteSource
  ) => Promise<LinksFile>;
  announce: (project: Project) => Promise<void>;
}

export type LinksWritten = (
  project: Project,
  before: LinksFile,
  after: LinksFile,
  source: CanvasWriteSource
) => void;

export type LinksFactory = (
  bus: EventBus,
  written?: LinksWritten
) => LinksService;

export interface CanvasSnapshot {
  canvas: CanvasFile | null;
  hash: string | null;
}

export interface CanvasWrite {
  source: CanvasWriteSource;
  writer?: string;
  baseHash?: string | null;
}

export interface CanvasService {
  ownerOf(project: Project): Direction;
  read(project: Project): Promise<CanvasSnapshot>;
  write(
    project: Project,
    canvas: CanvasFile,
    write: CanvasWrite
  ): Promise<CanvasSnapshot>;
  update(
    project: Project,
    change: (canvas: CanvasFile) => CanvasFile | null,
    write: CanvasWrite
  ): Promise<CanvasSnapshot>;
  announce(project: Project): Promise<void>;
  setPresence(projectId: string, presence: CanvasPresence): void;
  presence(projectId: string): CanvasPresence | null;
  point(project: Project, frameId: string, selector?: string): void;
  onLayoutChange?(listener: LayoutListener): void;
  links: LinksService;
}

const MAIN_DIRECTION_ID = "main";
const PRESENCE_TTL_MS = 10 * 60 * 1000;

export function canvasOwner(project: Project): Direction {
  const direction =
    project.directions.find(
      (candidate) => candidate.id === MAIN_DIRECTION_ID
    ) ?? project.directions[0];

  if (!direction) {
    throw new Error(`project ${project.id} has no directions`);
  }

  return direction;
}

export function canvasPath(workTree: string): string {
  return path.join(workTree, ...CANVAS_FILE.split("/"));
}

export type ProjectDirOf = (projectId: string) => string;

const APP_CANVAS_FILE = "canvas.json";

export function canvasFileOf(
  project: Project,
  projectDir: ProjectDirOf | null
): string {
  return project.app && projectDir
    ? path.join(projectDir(project.id), APP_CANVAS_FILE)
    : canvasPath(canvasOwner(project).workTree);
}

export async function readProjectCanvas(
  project: Project,
  projectDir: ProjectDirOf | null
): Promise<{ canvas: CanvasFile | null; text: string | null }> {
  const text = await readFile(canvasFileOf(project, projectDir), "utf-8").catch(
    () => null
  );

  if (text === null) {
    return project.app && projectDir
      ? readCanvasAt(canvasOwner(project).workTree)
      : { canvas: null, text: null };
  }

  return { canvas: parseCanvasText(text), text };
}

function setAsideName(now: Date): string {
  const stamp = now
    .toISOString()
    .replace(/\.\d+Z$/, "")
    .replaceAll(/[-:]/g, "")
    .replace("T", "-");

  return CANVAS_FILE.replace(/\.json$/, `.old-${stamp}.json`);
}

export async function setAsideLegacyCanvas(
  project: Project,
  projectDir: ProjectDirOf,
  tracked: (workTree: string, relative: string) => Promise<boolean>
): Promise<LegacyCanvasNotice | null> {
  if (!project.app) {
    return null;
  }

  const own = canvasFileOf(project, projectDir);

  if (
    await readFile(own, "utf-8").then(
      () => true,
      () => false
    )
  ) {
    return null;
  }

  const { workTree } = canvasOwner(project);
  const legacy = await readCanvasAt(workTree);

  if (legacy.text === null) {
    return null;
  }

  const frames = legacy.canvas?.frames.length ?? 0;

  if (await tracked(workTree, CANVAS_FILE)) {
    await writeAtomic(own, serializeCanvasFile(emptyCanvasFile()));

    return { file: CANVAS_FILE, frames, movedTo: null };
  }

  const movedTo = setAsideName(new Date());
  await rename(
    canvasPath(workTree),
    path.join(workTree, ...movedTo.split("/"))
  );

  return { file: CANVAS_FILE, frames, movedTo };
}

function hashOf(text: string): string {
  return createHash("sha1").update(text).digest("hex").slice(0, 16);
}

export async function readCanvasAt(
  workTree: string
): Promise<{ canvas: CanvasFile | null; text: string | null }> {
  const text = await readFile(canvasPath(workTree), "utf-8").catch(() => null);

  if (text === null) {
    return { canvas: null, text: null };
  }

  return { canvas: parseCanvasText(text), text };
}

export async function writeAtomic(target: string, text: string): Promise<void> {
  await platformWriteAtomic(target, text, {
    cleanup: "always",
    createDir: true,
  });
}

export function createCanvasCore(
  bus: EventBus,
  createLinksService: LinksFactory,
  projectDir: ProjectDirOf | null = null
): CanvasService {
  const lock = createKeyedMutex();
  const presences = new Map<string, CanvasPresence>();
  const listeners = new Set<LayoutListener>();

  const links = createLinksService(bus, (project, before, after, source) => {
    for (const listener of listeners) {
      listener(project, { after, before, kind: "links" }, source);
    }
  });

  const snapshotOf = async (project: Project): Promise<CanvasSnapshot> => {
    const { canvas, text } = await readProjectCanvas(project, projectDir);

    if (canvas === null || text === null) {
      return { canvas: null, hash: null };
    }

    return { canvas, hash: hashOf(serializeCanvasFile(canvas)) };
  };

  const emit = (
    project: Project,
    snapshot: CanvasSnapshot,
    write: CanvasWrite
  ): void => {
    bus.emit({
      canvas: snapshot.canvas,
      directionId: canvasOwner(project).id,
      hash: snapshot.hash,
      projectId: project.id,
      source: write.source,
      type: "canvas.changed",
      ...(write.writer ? { writer: write.writer } : {}),
    });
  };

  const store = async (
    project: Project,
    canvas: CanvasFile,
    write: CanvasWrite
  ): Promise<CanvasSnapshot> => {
    const text = serializeCanvasFile(canvas);
    const file = canvasFileOf(project, projectDir);
    const current = await readFile(file, "utf-8").catch(() => null);
    const saved = parseCanvasText(text) ?? emptyCanvasFile();
    const snapshot = { canvas: saved, hash: hashOf(text) };

    if (current === text) {
      return snapshot;
    }

    await writeAtomic(file, text);
    emit(project, snapshot, write);

    const before =
      (current === null ? null : parseCanvasText(current)) ?? emptyCanvasFile();

    for (const listener of listeners) {
      listener(project, { after: saved, before, kind: "canvas" }, write.source);
    }

    return snapshot;
  };

  const keyOf = (project: Project): string =>
    `${project.id}/${canvasOwner(project).id}`;

  return {
    async announce(project) {
      const snapshot = await lock(keyOf(project), () => snapshotOf(project));
      emit(project, snapshot, { source: "restore" });
      await links.announce(project);
    },

    links,

    onLayoutChange(listener) {
      listeners.add(listener);
    },

    ownerOf: canvasOwner,

    point(project, frameId, selector) {
      bus.emit({
        type: "canvas.point",
        projectId: project.id,
        directionId: canvasOwner(project).id,
        frameId,
        at: Date.now(),
        ...(selector ? { selector } : {}),
      });
    },

    presence(projectId) {
      const found = presences.get(projectId);

      if (!found || Date.now() - found.at > PRESENCE_TTL_MS) {
        return null;
      }

      return found;
    },

    read: snapshotOf,

    setPresence(projectId, presence) {
      presences.set(projectId, presence);
    },

    update(project, change, write) {
      return lock(keyOf(project), async () => {
        const current = await snapshotOf(project);
        const next = change(current.canvas ?? emptyCanvasFile());

        if (next === null) {
          return current;
        }

        return store(project, next, write);
      });
    },

    write(project, canvas, write) {
      return lock(keyOf(project), async () => {
        if (write.baseHash !== undefined) {
          const current = await snapshotOf(project);

          if (current.hash !== write.baseHash) {
            throw new ConflictError("canvas_stale");
          }
        }

        return store(project, canvas, write);
      });
    },
  };
}

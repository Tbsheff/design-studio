import { access } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project, Version } from "@design-studio/contracts";
import { CANVAS_FILE } from "@design-studio/contracts/canvas-file";
import { LINKS_FILE } from "@design-studio/contracts/links";

import type { VersionStore } from "../../shared/server-ports.js";
import { logError } from "../platform/logger/index.js";

interface LayoutVersionDeps {
  readonly delayMs: number;
  readonly emitStatus: (
    project: Project,
    direction: Direction
  ) => Promise<void>;
  readonly isRunning: (projectId: string, directionId: string) => boolean;
  readonly ownerOf: (project: Project) => Direction;
  readonly recordVersion: (
    project: Project,
    direction: Direction,
    version: Version
  ) => Promise<Direction>;
  readonly versions: Pick<VersionStore, "commitFile">;
  readonly withDirection: <Value>(
    projectId: string,
    directionId: string,
    task: (project: Project, direction: Direction) => Promise<Value>
  ) => Promise<Value>;
}

interface PendingLayout {
  readonly directionId: string;
  readonly labels: readonly string[];
  readonly timer: NodeJS.Timeout;
}

interface LayoutVersionQueue {
  readonly flushAll: () => Promise<void>;
  readonly note: (project: Project, label: string | null) => void;
}

const MAX_LABELS = 3;

const LAYOUT_FILES = [CANVAS_FILE, LINKS_FILE];

const toLowerFirst = (text: string): string =>
  `${text.charAt(0).toLowerCase()}${text.slice(1)}`;

const toLayoutTitle = (labels: readonly string[]): string => {
  const shown = labels
    .slice(0, MAX_LABELS)
    .map((label, index) => {
      if (index === 0) {
        return label;
      }

      return toLowerFirst(label);
    })
    .join(", ");

  if (shown === "") {
    return "Layout";
  }

  const more = labels.length - MAX_LABELS;

  if (more > 0) {
    return `Layout: ${shown} and ${more} more`;
  }

  return `Layout: ${shown}`;
};

const toNextLabels = (
  labels: readonly string[],
  label: string | null
): readonly string[] => {
  if (label === null || labels.at(-1) === label) {
    return labels;
  }

  return [...labels, label];
};

const isPresent = async (target: string): Promise<boolean> => {
  try {
    await access(target);

    return true;
  } catch {
    return false;
  }
};

const toLayoutFiles = async (direction: Direction): Promise<string[]> => {
  const present = await Promise.all(
    LAYOUT_FILES.map((file) =>
      isPresent(path.join(direction.workTree, ...file.split("/")))
    )
  );

  return LAYOUT_FILES.filter((_file, index) => present[index] === true);
};

const createLayoutVersion = async (
  deps: LayoutVersionDeps,
  project: Project,
  direction: Direction,
  labels: readonly string[]
): Promise<void> => {
  const files = await toLayoutFiles(direction);

  if (project.app || files.length === 0) {
    return;
  }

  const version = await deps.versions.commitFile(
    project,
    direction,
    files,
    toLayoutTitle(labels),
    { kind: "layout" }
  );

  if (version === null) {
    return;
  }

  await deps.recordVersion(project, direction, version);
  await deps.emitStatus(project, direction);
};

const createLayoutVersionQueue = (
  deps: LayoutVersionDeps
): LayoutVersionQueue => {
  const pending = new Map<string, PendingLayout>();

  const flush = async (projectId: string): Promise<void> => {
    const entry = pending.get(projectId);

    if (!entry) {
      return;
    }

    clearTimeout(entry.timer);
    pending.delete(projectId);

    if (deps.isRunning(projectId, entry.directionId)) {
      return;
    }

    await deps.withDirection(projectId, entry.directionId, (project, owner) =>
      createLayoutVersion(deps, project, owner, entry.labels)
    );
  };

  const runFlush = async (projectId: string): Promise<void> => {
    try {
      await flush(projectId);
    } catch (error) {
      logError("[versions] could not save the layout version", error);
    }
  };

  const note = (project: Project, label: string | null): void => {
    if (project.app) {
      return;
    }

    const known = pending.get(project.id);
    const labels = toNextLabels(known?.labels ?? [], label);

    if (known) {
      clearTimeout(known.timer);
    }

    const timer = setTimeout(() => {
      void runFlush(project.id);
    }, deps.delayMs);

    timer.unref();
    pending.set(project.id, {
      directionId: deps.ownerOf(project).id,
      labels,
      timer,
    });
  };

  const flushAll = async (): Promise<void> => {
    await Promise.all(
      [...pending.keys()].map((projectId) => runFlush(projectId))
    );
  };

  return { flushAll, note };
};

export { createLayoutVersionQueue };

export type { LayoutVersionDeps, LayoutVersionQueue };

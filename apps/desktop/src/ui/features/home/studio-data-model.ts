import type { Project, StudioEvent, Version } from "@design-studio/contracts";
import type { MutableRefObject } from "react";

import { reportFirstToken } from "../../platform/telemetry.js";

interface SendTimes {
  readonly pending: MutableRefObject<number | null>;
  readonly byRun: Map<string, number>;
}

const FIRST_RUNS = 12;

const MORE_RUNS = 16;

const THROUGH_RUNS = 60;

const SEND_GRACE_MS = 1000;

const updateFirstToken = (
  sends: SendTimes,
  projectId: string,
  event: StudioEvent
): void => {
  if (event.type === "run.started") {
    const pendingAt = sends.pending.current;

    if (pendingAt === null || event.ts < pendingAt - SEND_GRACE_MS) {
      return;
    }

    sends.byRun.set(event.runId, pendingAt);
    sends.pending.current = null;

    return;
  }

  if (event.type !== "run.text.delta" && event.type !== "run.thinking.delta") {
    return;
  }

  const sentAt = sends.byRun.get(event.runId) ?? null;

  if (sentAt === null) {
    return;
  }

  sends.byRun.delete(event.runId);
  reportFirstToken(projectId, event.directionId, event.runId, sentAt);
};

type Direction = Project["directions"][number];

const toUpdatedProject = (
  project: Project | null,
  direction: Direction
): Project | null => {
  if (!project) {
    return project;
  }

  const exists = project.directions.some((item) => item.id === direction.id);

  if (!exists) {
    return { ...project, directions: [...project.directions, direction] };
  }

  const directions = project.directions.map((item) => {
    if (item.id === direction.id) {
      return direction;
    }

    return item;
  });

  return { ...project, directions };
};

const toVersionsWith = (versions: Version[], version: Version): Version[] => {
  if (versions.some((item) => item.id === version.id)) {
    return versions;
  }

  return [version, ...versions];
};

const toBuildErrorsOnly = <Item extends { readonly source: string }>(
  errors: Item[]
): Item[] => {
  if (errors.some((item) => item.source !== "build")) {
    return errors.filter((item) => item.source === "build");
  }

  return errors;
};

const startSendNote = (sends: SendTimes): (() => void) => {
  const at = Date.now();
  sends.pending.current = at;

  return (): void => {
    if (sends.pending.current === at) {
      sends.pending.current = null;
    }
  };
};

export {
  FIRST_RUNS,
  MORE_RUNS,
  SEND_GRACE_MS,
  THROUGH_RUNS,
  startSendNote,
  toBuildErrorsOnly,
  toUpdatedProject,
  toVersionsWith,
  updateFirstToken,
};

export type { SendTimes };

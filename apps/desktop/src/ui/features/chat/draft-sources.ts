import type { Project } from "@design-studio/contracts";
import { createElement } from "react";
import type { ReactNode } from "react";

import { DraftSources } from "./draft-sources-view.js";
import { useDraftSources } from "./use-draft-sources.js";

interface DraftChrome {
  banner: ReactNode;
  reading: boolean;
  waitReason: string | null;
  locked: (running: boolean) => boolean;
  unfinished: (visible: boolean) => boolean;
}

const toWaitReason = (reading: boolean): string | null => {
  if (reading) {
    return "Wait for the sources to finish reading...";
  }

  return null;
};

const toBanner = (
  isBacked: boolean,
  state: ReturnType<typeof useDraftSources>
): ReactNode => {
  if (!isBacked) {
    return null;
  }

  return createElement(DraftSources, state);
};

const useDraftChrome = (
  projectId: string,
  project: Project | null
): DraftChrome => {
  const isBacked = Boolean(project?.designSystemFor);
  const sources = useDraftSources(projectId, isBacked);
  const reading = sources.state !== null && !sources.state.done;

  const banner = toBanner(isBacked, sources);
  const waitReason = toWaitReason(reading);
  const locked = (running: boolean): boolean => running || reading;
  const unfinished = (visible: boolean): boolean => visible && !reading;

  return { banner, locked, reading, unfinished, waitReason };
};

export { useDraftChrome };

export type { DraftChrome };

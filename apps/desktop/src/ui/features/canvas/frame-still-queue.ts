import { routes as workspaceRoutes } from "@design-studio/actions/workspace/routes";

import { call } from "../../platform/http.js";
import { toStillUrl, toTrimmedStills } from "./frame-still-model.js";
import type {
  FrameStills,
  StillJob,
  StillRequest,
} from "./frame-still-model.js";

interface ShotInput {
  readonly projectId: string;
  readonly frameId: string;
  readonly directionId?: string;
}

const toShotInput = (request: StillRequest): ShotInput => {
  if (request.directionId === null) {
    return { frameId: request.frameId, projectId: request.projectId };
  }

  return {
    directionId: request.directionId,
    frameId: request.frameId,
    projectId: request.projectId,
  };
};

const toShotUrl = async (request: StillRequest): Promise<string | null> => {
  try {
    const shot = await call(
      workspaceRoutes.getScreenshotWorkspace,
      toShotInput(request)
    );

    return toStillUrl(shot.mimeType, shot.data);
  } catch {
    return null;
  }
};

const runStillJobs = async (stills: FrameStills): Promise<void> => {
  if (stills.running.size > 0) {
    return;
  }

  const job = stills.jobs.shift();

  if (!job) {
    return;
  }

  stills.running.add(job.key);
  const url = await toShotUrl(job.request);
  stills.running.delete(job.key);

  if (url) {
    stills.urls.set(job.key, url);
    stills.latest.set(job.request.frameId, url);
    toTrimmedStills(stills.urls, stills.asked);
  }

  stills.changes.set(stills.changes.get() + 1);
  await runStillJobs(stills);
};

const startStillJob = (stills: FrameStills, job: StillJob): void => {
  if (stills.asked.has(job.key)) {
    return;
  }

  stills.asked.add(job.key);
  stills.jobs.push(job);
  void runStillJobs(stills);
};

const stopStillJob = (stills: FrameStills, key: string): void => {
  const index = stills.jobs.findIndex((job) => job.key === key);

  if (index === -1) {
    return;
  }

  stills.jobs.splice(index, 1);
  stills.asked.delete(key);
};

export { startStillJob, stopStillJob };

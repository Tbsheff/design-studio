import type {
  FirstVersionState,
  LegacyCanvasNotice,
  Project,
} from "@design-studio/contracts";

import {
  isFirstVersionDone,
  toFirstVersionState,
  toFirstVersionWaitText,
} from "../store/index.js";

export function toFirstPrototypeVersionText(): string {
  return "This prototype has no saved version yet. Save a version with create_version, or let a run finish, then call this tool again.";
}

export async function firstVersionBlock(
  project: {
    id: string;
    app?: unknown;
    directions: { headVersionId: string | null }[];
  },
  waitMs: number
): Promise<string | null> {
  if (!project.app || project.directions[0]?.headVersionId !== null) {
    return null;
  }

  const finished = await isFirstVersionDone(project.id, waitMs);

  return finished && !toFirstVersionState(project.id)?.error
    ? null
    : toFirstVersionWaitText(project.id);
}

export interface AttachResponse {
  project: Project;
  firstVersion: FirstVersionState | null;
  legacyCanvas: LegacyCanvasNotice | null;
}

function legacyCanvasNote(legacy: LegacyCanvasNotice): string {
  if (legacy.movedTo) {
    return `An old ${legacy.file} from an earlier attach (${legacy.frames} frames) was moved to ${legacy.movedTo}. Nothing was deleted. The new canvas has no saved frames: it shows the entry page as f1 until add_route_frame or canvas_place adds frames.`;
  }

  return `The old ${legacy.file} (${legacy.frames} frames) is tracked by your git, so it stays in place. The studio does not use it. The new canvas has no saved frames: it shows the entry page as f1 until add_route_frame or canvas_place adds frames.`;
}

export function attachReadiness(
  firstVersion: FirstVersionState | null,
  legacy: LegacyCanvasNotice | null
): {
  ready: boolean;
  etaSeconds: number;
  firstVersion?: string;
  oldCanvas?: string;
} {
  const ready = !firstVersion?.pending && !firstVersion?.error;
  const notes: { firstVersion?: string; oldCanvas?: string } = {};

  if (firstVersion?.pending) {
    notes.firstVersion = `The studio is saving the first version of the app in the background (about ${firstVersion.etaSeconds} s). get_screenshot, read_file and list_files work now. Edit tools wait up to 20 s for it, then say how long to wait.`;
  }

  if (firstVersion?.error) {
    notes.firstVersion = `The first version could not be saved: ${firstVersion.error}. Edits stay blocked until it is saved.`;
  }

  if (legacy) {
    notes.oldCanvas = legacyCanvasNote(legacy);
  }

  return {
    ready,
    etaSeconds: firstVersion?.pending ? firstVersion.etaSeconds : 0,
    ...notes,
  };
}

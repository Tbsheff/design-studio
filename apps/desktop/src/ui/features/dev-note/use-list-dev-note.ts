import { devNoteRoutes, useAction } from "./deps.js";
import type { ActionState } from "./deps.js";

const limit = 200;

const cursor = null;

const useListDevNote = (
  projectId: string,
  frameId: string
): ActionState<typeof devNoteRoutes.listDevNote> =>
  useAction(devNoteRoutes.listDevNote, {
    cursor,
    frameId,
    limit,
    projectId,
  });

export { useListDevNote };

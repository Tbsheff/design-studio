import { devNoteRoutes, useAction } from "./deps.js";
import type { ActionState } from "./deps.js";

const useCreateDevNote = (): ActionState<typeof devNoteRoutes.createDevNote> =>
  useAction(devNoteRoutes.createDevNote);

export { useCreateDevNote };

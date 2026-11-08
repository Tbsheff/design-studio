// @generated
import { createDevNote } from "./create.js";
import { deleteDevNote } from "./delete.js";
import { listDevNote } from "./list.js";
import { updateDevNote } from "./update.js";

const DevNoteActions = {
  createDevNote,
  deleteDevNote,
  listDevNote,
  updateDevNote,
} as const;

export { DevNoteActions };

// @generated
import type { DevNoteActions } from "@design-studio/actions/dev-note/index";

import type { Entries } from "../_core/handler.js";
import { handle as createDevNoteHandle } from "./create.js";
import {
  handle as deleteDevNoteHandle,
  preview as deleteDevNotePreview,
} from "./delete.js";
import { handle as listDevNoteHandle } from "./list.js";
import { handle as updateDevNoteHandle } from "./update.js";

const DevNoteEntries = {
  createDevNote: { handle: createDevNoteHandle },
  deleteDevNote: { handle: deleteDevNoteHandle, preview: deleteDevNotePreview },
  listDevNote: { handle: listDevNoteHandle },
  updateDevNote: { handle: updateDevNoteHandle },
} satisfies Entries<typeof DevNoteActions>;

export { DevNoteEntries };

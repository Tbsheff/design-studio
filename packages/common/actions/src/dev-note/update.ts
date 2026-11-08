import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  DevNoteIdSchema,
  DevNoteKindSchema,
  DevNoteSchema,
  DevNoteTextSchema,
  MeasuredFieldSchema,
} from "./schema.js";

const updateDevNote = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "update_dev_note",
    set: "core",
    short: "Change the text or kind of a dev note, or measure its layer again.",
  },
  confirm: "none",
  description:
    "Update one dev note: change the text, change the kind, or measure the layer again to refresh the stored box, padding, gap, radius, font and colors. Get the note id from list_dev_note. The note saves outside the canvas document and makes no version.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PATCH", path: "/api/projects/:projectId/dev-notes/:noteId" },
  id: "dev-note.update",
  input: Schema.Struct({
    isMeasured: MeasuredFieldSchema,
    kind: Schema.NullOr(DevNoteKindSchema),
    noteId: DevNoteIdSchema,
    projectId: ProjectIdSchema,
    text: Schema.NullOr(DevNoteTextSchema),
  }),
  invalidates: ["dev-note.list"],
  mcp: { name: "update_dev_note" },
  needs: "project.update",
  output: DevNoteSchema,
  scope: "project",
});

export { updateDevNote };

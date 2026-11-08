import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { DevNoteIdSchema, DevNoteRemovedSchema } from "./schema.js";

const deleteDevNote = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "delete_dev_note",
    set: "core",
    short: "Delete one dev note after the user confirms.",
  },
  confirm: "user",
  description:
    "Delete one dev note. The user must confirm first. The confirm card shows the note text. Get the note id from list_dev_note. The delete cannot be undone.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "DELETE",
    path: "/api/projects/:projectId/dev-notes/:noteId",
  },
  id: "dev-note.delete",
  input: Schema.Struct({
    noteId: DevNoteIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["dev-note.list"],
  mcp: { name: "delete_dev_note" },
  needs: "project.update",
  output: DevNoteRemovedSchema,
  scope: "project",
});

export { deleteDevNote };

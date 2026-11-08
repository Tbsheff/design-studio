import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { DevNoteSchema, FrameFilterFieldSchema } from "./schema.js";

const listDevNote = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "list_dev_note",
    set: "core",
    short:
      "List dev notes with measured values for a project or one frame. Reads only.",
  },
  confirm: "none",
  description:
    "List the dev notes of a project, or of one frame. Each note has a number, the layer, the source file and line, a kind, the text and the measured values: box, padding, gap, radius, font and colors with token names. Read the notes before you build a frame, and build to the exact values. Reads only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/dev-notes" },
  id: "dev-note.list",
  input: Schema.Struct({
    ...PageFields,
    frameId: FrameFilterFieldSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_dev_note" },
  needs: "project.read",
  output: pageOf(DevNoteSchema),
  scope: "project",
});

export { listDevNote };

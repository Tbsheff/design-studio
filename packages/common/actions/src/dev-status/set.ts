import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { FrameIdSchema, ProjectIdSchema } from "../_core/ids.js";
import {
  DevStatusEntrySchema,
  DevStatusValueSchema,
  NoteFieldSchema,
} from "./schema.js";

const setDevStatus = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "set_dev_status",
    set: "core",
    short:
      "Mark a frame draft, in-review, ready or built for dev. Stamps the version and source file hashes. Writes no canvas file.",
  },
  confirm: "none",
  description:
    "Set the dev status of one frame: draft, in-review, ready or built. The action stamps the current head version of the frame direction and a content hash of each source file of the frame route. Use list_dev_status to see which ready frames changed since. Saves outside the canvas document.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/dev-status" },
  id: "dev-status.set",
  input: Schema.Struct({
    frameId: FrameIdSchema,
    note: NoteFieldSchema,
    projectId: ProjectIdSchema,
    status: DevStatusValueSchema,
  }),
  invalidates: ["dev-status.list"],
  mcp: { name: "set_dev_status" },
  needs: "project.update",
  output: DevStatusEntrySchema,
  scope: "project",
});

export { setDevStatus };

import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { FrameIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { ReferencePinSetSchema } from "./schema.js";

const setReference = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_reference",
    set: "core",
    short:
      "Pin or unpin a canvas frame as a style reference that every later run in the project matches.",
  },
  confirm: "none",
  description:
    "Pin or unpin one canvas frame as a style reference for the project. On pin the studio saves a screenshot of the frame. Every later run in the project gets the pinned frames, with their source file and screenshot, and matches their style.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "PUT",
    path: "/api/projects/:projectId/references/pins/:frameId",
  },
  id: "reference.set",
  input: Schema.Struct({
    frameId: FrameIdSchema,
    isPinned: Schema.Boolean.annotate({
      description: "True to pin the frame, false to unpin it.",
    }),
    projectId: ProjectIdSchema,
  }),
  invalidates: ["reference.list", "run.getContext"],
  mcp: { name: "set_reference" },
  needs: "project.update",
  output: ReferencePinSetSchema,
  scope: "project",
});

export { setReference };

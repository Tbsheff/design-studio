import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { CanvasPresenceSavedSchema, PresenceFields } from "./schema.js";

const setPresenceCanvas = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Tell the studio which frame and elements the user has open on the canvas. The agent reads this as the user's current view. It is not saved to disk.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PUT", path: "/api/projects/:projectId/canvas/presence" },
  id: "canvas.setPresence",
  input: Schema.Struct({
    ...PresenceFields,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: CanvasPresenceSavedSchema,
  scope: "project",
});

export { setPresenceCanvas };

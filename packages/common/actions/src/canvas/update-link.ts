import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  FrameRefSchema,
  LinkIdSchema,
  LinkMotionFields,
  LinkSavedSchema,
} from "./schema.js";

const ToFrameSchema = FrameRefSchema.annotate({
  description: "Frame id or @label, or back.",
});

const updateLinkCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "update_link",
    set: "core",
    short:
      "Change the target, action or transition of one saved prototype link by id.",
  },
  confirm: "none",
  description:
    "Change one saved prototype link: its target frame (or back), action, transition, duration or easing. Fields you leave out stay as they are. Each link change is one step in the edit history.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PATCH", path: "/api/projects/:projectId/links/:linkId" },
  id: "canvas.updateLink",
  input: Schema.Struct({
    ...LinkMotionFields,
    linkId: LinkIdSchema.annotate({
      description: "Link id from list_links, for example l2.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    toFrame: Schema.optionalKey(ToFrameSchema),
  }),
  invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
  mcp: { name: "update_link" },
  needs: "project.update",
  output: LinkSavedSchema,
  scope: "project",
});

export { updateLinkCanvas };

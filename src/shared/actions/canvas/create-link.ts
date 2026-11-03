import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  FrameRefSchema,
  LinkMotionFields,
  LinkSavedSchema,
  LinkSelectorSchema,
} from "./schema.js";

const createLinkCanvas = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Link an element (CSS selector on the page of fromFrame) to another frame: on click, go to toFrame (action navigate) or open it as a modal or drawer over the current frame, with a transition, a duration and an easing. toFrame back goes back to the frame before. A second link on the same element replaces the first. Each link change is one step in the edit history.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/links" },
  id: "canvas.createLink",
  input: Schema.Struct({
    ...LinkMotionFields,
    fromFrame: FrameRefSchema.annotate({
      description: "Frame id or @label of the frame that has the element.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    selector: LinkSelectorSchema.annotate({
      description:
        "CSS selector of the element to click, for example #sign-in.",
    }),
    tag: Schema.optionalKey(Schema.String),
    text: Schema.optionalKey(Schema.String),
    toFrame: FrameRefSchema.annotate({
      description: "Frame id or @label to go to, or back.",
    }),
  }),
  invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
  mcp: { name: "add_link" },
  needs: "project.update",
  output: LinkSavedSchema,
  scope: "project",
});

export { createLinkCanvas };

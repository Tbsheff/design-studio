import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { LinkInteractionFields, LinkSavedSchema } from "./schema.js";

const setLinkInteractionCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_link_interaction",
    set: "core",
    short:
      "Set the trigger, action and target of one prototype link, or make one from a source element. One undo step.",
  },
  confirm: "none",
  description:
    "Set the trigger, action and target of one prototype link (linkId), or make a link from a source element (fromFrame and selector). trigger: click (default), hover, press, delay (delayMs), key (key), swipe-left, swipe-right, swipe-up or swipe-down. action: navigate, modal, drawer, popover (toFrame, placement, isOutsideClose), scroll-to, toggle (target), open-url (url), close-overlay, or set-variable (variableName, variableOp, variableValue). whenName and whenEquals make the link fire only when that Play variable matches; whenName null clears it. One undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/links/interaction" },
  id: "canvas.setLinkInteraction",
  input: Schema.Struct({
    ...LinkInteractionFields,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [
    "canvas.listLinks",
    "canvas.listLinkInteractions",
    "canvas.listImplicitLinks",
  ],
  mcp: { name: "set_link_interaction" },
  needs: "project.update",
  output: LinkSavedSchema,
  scope: "project",
});

export { setLinkInteractionCanvas };

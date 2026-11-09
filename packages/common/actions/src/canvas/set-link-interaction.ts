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
    "Set the trigger, action and target of one prototype link (linkId), or make a link from a source element (fromFrame and selector). trigger: click (default), hover, press, delay (delayMs), key (key) or swipe-left, swipe-right, swipe-up, swipe-down (a drag of 40 px or more in 600 ms). action: navigate, modal or drawer (toFrame), scroll-to (target selector), open-url (https url), close-overlay, toggle (target selector, show or hide), or set-variable (variableName, variableOp set, toggle or add, variableValue) for a Play variable. whenName and whenEquals make the link fire only when that variable equals the value; whenName null clears it. Variables live in Play memory, reset on each Play start. One element has one link per trigger; a new link replaces the old one. Links live in .studio/links.json, not in the page code. Each change is one history step.",
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

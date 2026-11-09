import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { PageFields } from "../_core/list-page.js";
import { LinkInteractionListFields, LinkListSchema } from "./schema.js";

const inspectLinkInteractionCanvas = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_link_interactions",
    set: "core",
    short:
      "Read only. Saved prototype links with trigger (click, hover, press, delay, key), action and target (frame, selector or url).",
  },
  confirm: "none",
  description:
    "List the saved prototype links with their trigger (click, hover, press, delay with delayMs, key with key), action (navigate, modal, drawer, popover with placement and isOutsideClose, scroll-to, open-url, close-overlay, toggle), target (toFrame, a target selector with visibility, or url) and broken (null, or why the link no longer works). Read only. Links live in the studio (.studio/links.json), not in the page code. limit caps the listed links.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/link-interactions" },
  id: "canvas.inspectLinkInteraction",
  input: Schema.Struct({
    ...LinkInteractionListFields,
    limit: PageFields.limit,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [],
  mcp: { name: "list_link_interactions" },
  needs: "project.read",
  output: LinkListSchema,
  scope: "project",
});

export { inspectLinkInteractionCanvas };

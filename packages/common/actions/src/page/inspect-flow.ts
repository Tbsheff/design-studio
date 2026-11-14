import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageFlowEntrySchema, PageFlowSchema } from "./flow/schema.js";

const inspectFlowPage = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "inspect_flow_page",
    set: "core",
    short:
      "Compare the linked HTML pages of a flow: header, nav, footer, :root values and style sheets.",
  },
  confirm: "none",
  description:
    "Compare the HTML pages of a flow that link to each other. It follows the links from the entry page, up to 12 pages, and reports each header, nav or footer of the entry page that is missing or changed on a linked page, each :root custom property with a different value, and each style sheet or font link that a page lacks. Copy a changed part with update_matches_page.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/pages/flow",
  },
  id: "page.inspectFlow",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    entry: PageFlowEntrySchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "inspect_flow_page" },
  needs: "project.read",
  output: PageFlowSchema,
  scope: "project",
});

export { inspectFlowPage };

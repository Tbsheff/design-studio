import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FlowRouteLinksSchema, FlowRouteSchema } from "./schema.js";

const listFlowLinksCanvas = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the links found in the source of one app route: kind (link, push, form, redirect), href, the route it goes to, the element to click (selector and text) and file:line. Attached Next.js apps only. The route is a pattern from list_routes or a concrete path.",
  errors: [BadRequest, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/flow/links" },
  id: "canvas.listFlowLinks",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    route: FlowRouteSchema.annotate({
      description:
        "Route pattern from list_routes or a concrete path such as /organizations/acme/patients.",
    }),
  }),
  invalidates: [],
  mcp: { name: "list_route_links" },
  needs: "project.read",
  output: FlowRouteLinksSchema,
  scope: "project",
});

export { listFlowLinksCanvas };

import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { RouteListSchema, RouteTextSchema } from "./schema.js";

const ROUTE_LIMIT_MAX = 500;

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects",
});

const QueryFieldSchema = RouteTextSchema.annotate({
  description:
    'Search text matched against the route, page file and route group, for example "f2f" or "admin/users".',
});

const LimitFieldSchema = Schema.Int.check(
  Schema.isBetween({ maximum: ROUTE_LIMIT_MAX, minimum: 1 })
).annotate({ description: "Routes per page. Default 50." });

const CursorFieldSchema = Schema.String.annotate({
  description: "nextCursor from the previous page.",
});

const listRoutesMcpRead = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "List the routes of an attached Next.js app from its app router (app/**/page.tsx): route, page file, dynamic, route group. Pages hold 50 routes; pass nextCursor as cursor for the next page.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/routes" },
  id: "mcp-read.listRoutes",
  input: Schema.Struct({
    cursor: Schema.optionalKey(CursorFieldSchema),
    limit: Schema.optionalKey(LimitFieldSchema),
    projectId: ProjectFieldSchema,
    query: Schema.optionalKey(QueryFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "list_routes" },
  needs: "project.read",
  output: RouteListSchema,
  scope: "project",
});

export { listRoutesMcpRead };

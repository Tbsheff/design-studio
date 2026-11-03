import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { ComponentUsageSchema, PathTextSchema } from "./schema.js";

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects.",
});

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const FileFieldSchema = PathTextSchema.annotate({
  description:
    'Source file of a component or layout, relative to the app folder or the project folder, for example "components/auth/auth-background-panel.tsx". The file part of a data-studio-loc or a get_layers file:line:col works.',
});

const UsedAtFieldSchema = PathTextSchema.annotate({
  description:
    'File of the call site that renders the selected use (the usedAt file of a selection), for example "app/(auth)/layout.tsx". With it the result has callSite.',
});

const RouteFieldSchema = PathTextSchema.annotate({
  description:
    'Route of the frame the use is on, for example "/sign-in". With it the result has callSite and its pageFile.',
});

const getUsageMcpRead = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    'List the app routes that render one source file, directly from the page or through a layout or any import chain, the same count the studio inline prompt shows as "All uses (N)". Returns file, component and routes ({route, file}). With usedAt or route it also returns callSite {file, kind: page, component or layout, routes, routeLocal, pageFile}: routeLocal false means no change can stay on one route. Prototype (HTML) projects return no routes. Read only.',
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/usage" },
  id: "mcp-read.getUsage",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    file: FileFieldSchema,
    projectId: ProjectFieldSchema,
    route: Schema.optionalKey(RouteFieldSchema),
    usedAt: Schema.optionalKey(UsedAtFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "get_component_usage" },
  needs: "project.read",
  output: ComponentUsageSchema,
  scope: "project",
});

export { getUsageMcpRead };

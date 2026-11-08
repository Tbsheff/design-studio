import { PORT_FLOW_MAX_PAGES } from "@design-studio/contracts/port";
import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import {
  PathTextSchema,
  PortPlanViewSchema,
  RouteTextSchema,
} from "./schema.js";

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description:
    "The prototype project id (an HTML project), from list_projects.",
});

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const PageFieldSchema = PathTextSchema.annotate({
  description:
    'HTML page in the prototype project, for example "index.html". Leave out for index.html. With flow or paths it is the first page of the flow, which gets the base route.',
});

const PathsFieldSchema = Schema.Array(PathTextSchema)
  .check(Schema.isMaxLength(PORT_FLOW_MAX_PAGES))
  .annotate({
    description:
      'Port these pages of the prototype as one flow, for example ["index.html", "time.html"]. They come back in flow order.',
  });

const FlowFieldSchema = Schema.Boolean.annotate({
  description:
    "true: follow the links from path (anchors, form actions and page names in scripts) and plan every page of the flow.",
});

const TargetFieldSchema = ProjectIdSchema.annotate({
  description:
    "The attached app project id to port into (a project made with Open app), from list_projects. Leave out to read the page only.",
});

const RouteFieldSchema = RouteTextSchema.annotate({
  description:
    'The new app route, for example "/classes" or "/(design)/classes". With flow or paths it is the base route: the first page gets it and each other page gets <route>/<page name>.',
});

const getPortPlanWorkspace = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_port_plan",
    set: "app",
    short:
      "Read only. Plan how to move an HTML page into the attached app as one React route.",
  },
  confirm: "none",
  description:
    'Plan how to move an HTML prototype page into an attached app as one React route, the same plan the studio "Move to app" dialog uses: sections, steps, repeated blocks, headings, actions, images, links, tokens mapped to the app tokens, parts to leave out, and kit (app components that fit). With route it also returns the route file and routeExists. With flow: true or paths it plans a whole flow: pages in flow order with routes, the link map, unselected and unreached pages. Read only: it never starts a run.',
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/port/plan" },
  id: "workspace.getPortPlan",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    flow: Schema.optionalKey(FlowFieldSchema),
    path: Schema.optionalKey(PageFieldSchema),
    paths: Schema.optionalKey(PathsFieldSchema),
    projectId: ProjectFieldSchema,
    route: Schema.optionalKey(RouteFieldSchema),
    targetProjectId: Schema.optionalKey(TargetFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "get_port_plan" },
  needs: "project.read",
  output: PortPlanViewSchema,
  scope: "project",
});

export { getPortPlanWorkspace };

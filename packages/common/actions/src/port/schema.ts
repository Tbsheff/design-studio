import { PORT_FLOW_MAX_PAGES } from "@design-studio/contracts/port";
import { Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PathTextSchema, RouteTextSchema } from "../workspace/schema.js";

const PathListSchema = Schema.Array(PathTextSchema);

const PathsFieldSchema = PathListSchema.check(
  Schema.isMaxLength(PORT_FLOW_MAX_PAGES)
).annotate({
  description:
    'Move these pages of the prototype as one flow, for example ["index.html", "time.html"].',
});

const PortStartInputSchema = Schema.Struct({
  directionId: Schema.optionalKey(
    DirectionIdSchema.annotate({
      description:
        "Direction id of the prototype. Leave out for the main direction.",
    })
  ),
  flow: Schema.optionalKey(
    Schema.Boolean.annotate({
      description:
        "true: follow the links from path and move every page of the flow, as get_port_plan does.",
    })
  ),
  path: Schema.optionalKey(
    PathTextSchema.annotate({
      description:
        'HTML page in the prototype project, for example "index.html". Leave out for index.html. With flow or paths it is the first page, which gets the base route.',
    })
  ),
  paths: Schema.optionalKey(PathsFieldSchema),
  projectId: ProjectIdSchema.annotate({
    description:
      "The prototype project id (an HTML project), from list_projects.",
  }),
  route: RouteTextSchema.check(Schema.isMinLength(1)).annotate({
    description:
      'The new app route, for example "/classes" or "/(design)/classes". With flow or paths it is the base route.',
  }),
  targetProjectId: ProjectIdSchema.annotate({
    description:
      "The attached app project id to move the page into (a project made with Open app), from list_projects.",
  }),
});

const PortRouteSchema = Schema.Struct({
  path: Schema.String,
  route: Schema.String,
  routeFile: Schema.NullOr(Schema.String),
});

const PortStartedSchema = Schema.Struct({
  directionId: Schema.String,
  projectId: Schema.String,
  route: Schema.String,
  routeFile: Schema.NullOr(Schema.String),
  routes: Schema.Array(PortRouteSchema),
  runId: Schema.String,
});

type PortStarted = typeof PortStartedSchema.Type;

export { PortRouteSchema, PortStartInputSchema, PortStartedSchema };

export type { PortStarted };

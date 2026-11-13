import { PORT_FLOW_MAX_PAGES } from "@design-studio/contracts/port";
import { Effect, Schema } from "effect";

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

const PORT_WIDTH_MIN = 320;

const PORT_WIDTH_MAX = 2560;

const PORT_WIDTH_DEFAULT = 1280;

const PortCheckDirectionSchema = DirectionIdSchema.annotate({
  description: "Direction id of the prototype. null for the main direction.",
});

const NO_DIRECTION = Effect.succeed(null);

const PORT_WIDTH_FALLBACK = Effect.succeed(PORT_WIDTH_DEFAULT);

const PortWidthSchema = Schema.Int.check(
  Schema.isBetween({ maximum: PORT_WIDTH_MAX, minimum: PORT_WIDTH_MIN })
).annotate({
  description: "Width in px to render both pages at. Default 1280.",
});

const PORT_AREA_MAX = 9;

const PORT_AREA_DEFAULT = Effect.succeed(PORT_AREA_MAX);

const PortAreaLimitSchema = Schema.Int.check(
  Schema.isBetween({ maximum: PORT_AREA_MAX, minimum: 1 })
).annotate({
  description:
    "How many of the areas under 80 to list, worst first, from 1 to 9. Default 9.",
});

const PortCheckInputSchema = Schema.Struct({
  directionId: Schema.NullOr(PortCheckDirectionSchema).pipe(
    Schema.withDecodingDefaultKey(NO_DIRECTION)
  ),
  limit: PortAreaLimitSchema.pipe(
    Schema.withDecodingDefaultKey(PORT_AREA_DEFAULT)
  ),
  path: PathTextSchema.check(Schema.isMinLength(1)).annotate({
    description:
      'HTML page in the prototype project that was moved, for example "index.html".',
  }),
  projectId: ProjectIdSchema.annotate({
    description:
      "The prototype project id (an HTML project), from list_projects.",
  }),
  routePath: RouteTextSchema.check(Schema.isMinLength(1)).annotate({
    description:
      'The app route that the port wrote, for example "/classes" or "/(design)/classes".',
  }),
  targetProjectId: ProjectIdSchema.annotate({
    description:
      "The attached app project id that holds the route, from list_projects.",
  }),
  width: PortWidthSchema.pipe(
    Schema.withDecodingDefaultKey(PORT_WIDTH_FALLBACK)
  ),
});

const PortAreaSchema = Schema.Struct({
  col: Schema.Int,
  name: Schema.String,
  row: Schema.Int,
  score: Schema.Int,
});

const PortMatchSchema = Schema.Struct({
  appPath: Schema.String,
  areas: Schema.Array(PortAreaSchema),
  diffPath: Schema.String,
  isLow: Schema.Boolean,
  prototypePath: Schema.String,
  score: Schema.Int,
});

type PortStarted = typeof PortStartedSchema.Type;

type PortArea = typeof PortAreaSchema.Type;

type PortMatch = typeof PortMatchSchema.Type;

type PortAreaWire = typeof PortAreaSchema.Encoded;

type PortMatchWire = typeof PortMatchSchema.Encoded;

export {
  PortAreaSchema,
  PortCheckInputSchema,
  PortMatchSchema,
  PortRouteSchema,
  PortStartInputSchema,
  PortStartedSchema,
};

export type { PortArea, PortAreaWire, PortMatch, PortMatchWire, PortStarted };

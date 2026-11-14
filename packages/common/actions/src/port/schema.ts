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

const PORT_AREA_ELEMENTS_MAX = 3;

const PORT_MASKED_MAX = 20;

const PORT_DIFFS_MAX = 6;

const PortDiffSchema = Schema.Struct({
  app: Schema.String,
  property: Schema.String,
  prototype: Schema.String,
});

const PortElementSchema = Schema.Struct({
  diffs: Schema.Array(PortDiffSchema)
    .check(Schema.isMaxLength(PORT_DIFFS_MAX))
    .annotate({
      description:
        "Computed values that differ between this app element and its paired prototype element, for example margin-bottom app 4px, prototype 24px. Empty when the element has no pair.",
    }),
  selector: Schema.String,
  text: Schema.String,
});

const PortFirstShiftSchema = Schema.Struct({
  above: Schema.NullOr(PortElementSchema),
  element: PortElementSchema,
  shift: Schema.Int.annotate({
    description:
      "How far in px the content from element sits below the prototype (negative: above it), from the element just above it.",
  }),
});

const PortAreaSchema = Schema.Struct({
  col: Schema.Int,
  elements: Schema.Array(PortElementSchema)
    .check(Schema.isMaxLength(PORT_AREA_ELEMENTS_MAX))
    .annotate({
      description:
        "Up to 3 app elements in this area, with a CSS selector and their text.",
    }),
  name: Schema.String,
  row: Schema.Int,
  score: Schema.Int,
});

const PortMaskedSchema = Schema.Struct({
  reason: Schema.Literals(["app-change", "data-row"]),
  text: Schema.String,
});

const PortMatchSchema = Schema.Struct({
  appPath: Schema.String,
  areas: Schema.Array(PortAreaSchema),
  diffPath: Schema.String,
  firstShift: Schema.NullOr(PortFirstShiftSchema).annotate({
    description:
      "The first paired element whose top offset changes by 2px or more from the pair before it, with the element just above it. null when no content moved.",
  }),
  isLow: Schema.Boolean,
  masked: Schema.Array(PortMaskedSchema)
    .check(Schema.isMaxLength(PORT_MASKED_MAX))
    .annotate({
      description:
        "For a route update: the kept app text and the data row text that the score does not count. Empty for a new route.",
    }),
  prototypePath: Schema.String,
  score: Schema.Int,
});

const PortApplyInputSchema = Schema.Struct({
  directionId: PortCheckInputSchema.fields.directionId,
  path: PortCheckInputSchema.fields.path,
  projectId: PortCheckInputSchema.fields.projectId,
  routePath: PortCheckInputSchema.fields.routePath,
  targetProjectId: PortCheckInputSchema.fields.targetProjectId,
  width: PortCheckInputSchema.fields.width,
});

const PORT_APPLY_MAX = 40;

const PortSkipReasonSchema = Schema.Literals([
  "no-source",
  "shared-site",
  "dynamic-site",
  "inherited",
  "follows-parent",
  "not-written",
]).annotate({
  description:
    "no-source: the element has no source site. shared-site: one site renders more than one element. dynamic-site: the class is built at run time. inherited: the value comes from a parent. follows-parent: the size follows the parent or the content. not-written: the edit could not be planned.",
});

const PortWriteSchema = Schema.Struct({
  app: Schema.String,
  file: Schema.String,
  property: Schema.String,
  prototype: Schema.String,
  selector: Schema.String,
  text: Schema.String,
  written: Schema.String.annotate({
    description:
      "The class or declaration the studio wrote, for example mb-6 (was mb-2) or margin-bottom: 24px.",
  }),
});

const PortSkipSchema = Schema.Struct({
  app: Schema.String,
  property: Schema.String,
  prototype: Schema.String,
  reason: PortSkipReasonSchema,
  selector: Schema.String,
  text: Schema.String,
});

const PortAppliedSchema = Schema.Struct({
  applied: Schema.Array(PortWriteSchema).check(
    Schema.isMaxLength(PORT_APPLY_MAX)
  ),
  scoreAfter: Schema.Int.annotate({
    description:
      "Port score after the writes. The same as scoreBefore when nothing was written.",
  }),
  scoreBefore: Schema.Int,
  skipped: Schema.Array(PortSkipSchema).check(
    Schema.isMaxLength(PORT_APPLY_MAX)
  ),
  versionId: Schema.NullOr(Schema.String).annotate({
    description:
      "The app version with all the writes. null when nothing was written.",
  }),
});

type PortStarted = typeof PortStartedSchema.Type;

type PortArea = typeof PortAreaSchema.Type;

type PortElement = typeof PortElementSchema.Type;

type PortDiff = typeof PortDiffSchema.Type;

type PortFirstShift = typeof PortFirstShiftSchema.Type;

type PortMasked = typeof PortMaskedSchema.Type;

type PortMatch = typeof PortMatchSchema.Type;

type PortApplied = typeof PortAppliedSchema.Type;

type PortWrite = typeof PortWriteSchema.Type;

type PortSkip = typeof PortSkipSchema.Type;

type PortSkipReason = typeof PortSkipReasonSchema.Type;

type PortAreaWire = typeof PortAreaSchema.Encoded;

type PortMatchWire = typeof PortMatchSchema.Encoded;

export {
  PORT_APPLY_MAX,
  PORT_AREA_ELEMENTS_MAX,
  PORT_DIFFS_MAX,
  PORT_MASKED_MAX,
  PortAppliedSchema,
  PortApplyInputSchema,
  PortAreaSchema,
  PortCheckInputSchema,
  PortDiffSchema,
  PortElementSchema,
  PortFirstShiftSchema,
  PortMaskedSchema,
  PortMatchSchema,
  PortRouteSchema,
  PortStartInputSchema,
  PortSkipSchema,
  PortStartedSchema,
  PortWriteSchema,
};

export type {
  PortApplied,
  PortArea,
  PortAreaWire,
  PortDiff,
  PortElement,
  PortFirstShift,
  PortMasked,
  PortMatch,
  PortMatchWire,
  PortSkip,
  PortSkipReason,
  PortStarted,
  PortWrite,
};

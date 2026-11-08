import {
  PAGE_IMPORT_SELECTOR_MAX,
  PAGE_IMPORT_URL_MAX,
  PAGE_IMPORT_WIDTH_MAX,
  PAGE_IMPORT_WIDTH_MIN,
} from "@design-studio/contracts/page-import";
import { Effect, Schema } from "effect";

import { ElementTargetSchema } from "../_core/element-target.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const NAME_MAX = 80;

const TAG_MAX = 32;

const TAGS_MAX = 12;

const QUERY_MAX = 80;

const THUMBNAIL_MAX = 200_000;

const ITEMS_MAX = 200;

const PAGE_NAME_MAX = 120;

const PatternIdSchema = Schema.String.check(
  Schema.isPattern(/^[a-z0-9][a-z0-9-]{0,79}$/u)
);

const PatternKindSchema = Schema.Literals(["react", "html"]);

const PatternNameSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(NAME_MAX)
);

const PatternTagsSchema = Schema.Array(
  Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(TAG_MAX))
).check(Schema.isMaxLength(TAGS_MAX));

const PatternPositionSchema = Schema.Literals([
  "inside",
  "before",
  "after",
  "replace",
]);

const PatternImportSchema = Schema.Struct({
  file: Schema.NullOr(Schema.String),
  isDefault: Schema.Boolean,
  name: Schema.String,
  specifier: Schema.String,
});

const PatternTokenSchema = Schema.Struct({
  name: Schema.String,
  value: Schema.NullOr(Schema.String),
});

const WIDTH_DEFAULT = 1280;

const NULL_DEFAULT = Effect.succeed(null);

const LAYER_DEFAULT = Effect.succeed("layer" as const);

const ORIGIN_TEXT =
  "layer: saved from a layer of a project. url: captured from a web page.";

const PatternOriginSchema = Schema.Literals(["layer", "url"]);

const PatternSchema = Schema.Struct({
  id: PatternIdSchema,
  importCount: Schema.Int,
  isClient: Schema.Boolean,
  kind: PatternKindSchema,
  name: PatternNameSchema,
  origin: PatternOriginSchema.annotate({ description: ORIGIN_TEXT }).pipe(
    Schema.withDecodingDefaultKey(LAYER_DEFAULT)
  ),
  savedAt: Schema.String,
  sourceName: Schema.String,
  sourceUrl: Schema.NullOr(Schema.String)
    .annotate({ description: "The page URL of a url pattern. null otherwise." })
    .pipe(Schema.withDecodingDefaultKey(NULL_DEFAULT)),
  tags: PatternTagsSchema,
  tokenCount: Schema.Int,
});

const PatternAssetsSchema = Schema.Array(Schema.String)
  .check(Schema.isMaxLength(ITEMS_MAX))
  .annotate({ description: "Content-hashed asset files copied from the page." })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed([])));

const PatternReferencePathSchema = Schema.NullOr(Schema.String)
  .annotate({
    description:
      "Absolute path of the reference PNG of a url pattern. null otherwise.",
  })
  .pipe(Schema.withDecodingDefaultKey(NULL_DEFAULT));

const PatternDetailSchema = Schema.Struct({
  ...PatternSchema.fields,
  assets: PatternAssetsSchema,
  helpers: Schema.Array(Schema.String).check(Schema.isMaxLength(ITEMS_MAX)),
  imports: Schema.Array(PatternImportSchema).check(
    Schema.isMaxLength(ITEMS_MAX)
  ),
  referencePath: PatternReferencePathSchema,
  references: Schema.Array(Schema.String).check(Schema.isMaxLength(ITEMS_MAX)),
  source: Schema.String,
  sourceFile: Schema.String,
  sourceProjectId: Schema.String,
  thumbnail: Schema.NullOr(Schema.String),
  tokens: Schema.Array(PatternTokenSchema).check(Schema.isMaxLength(ITEMS_MAX)),
});

const PatternGetSchema = Schema.Struct({ pattern: PatternDetailSchema });

const PatternUrlSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PAGE_IMPORT_URL_MAX)
).annotate({
  description:
    "The page to capture from: an https URL, or http://localhost:<port>/... for a preview or dev server.",
});

const PatternWidthSchema = Schema.Int.check(
  Schema.isBetween({
    maximum: PAGE_IMPORT_WIDTH_MAX,
    minimum: PAGE_IMPORT_WIDTH_MIN,
  })
)
  .annotate({
    description: `Viewport width in px (${PAGE_IMPORT_WIDTH_MIN} to ${PAGE_IMPORT_WIDTH_MAX}). Default 1280.`,
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(WIDTH_DEFAULT)));

const PatternUrlFields = {
  url: PatternUrlSchema,
  width: PatternWidthSchema,
} as const;

const FALSE_DEFAULT = Effect.succeed(false);

const PatternInspectFields = {
  ...PatternUrlFields,
  hasThumbnails: Schema.Boolean.annotate({
    description:
      "Also return a small JPEG data URL for each candidate. Leave out when you read the crops from shotPath.",
  }).pipe(Schema.withDecodingDefaultKey(FALSE_DEFAULT)),
} as const;

const PatternImportFields = {
  ...PatternUrlFields,
  name: PatternNameSchema,
  selector: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PAGE_IMPORT_SELECTOR_MAX)
  ).annotate({
    description:
      "CSS selector of the section to capture. Take it from inspect_pattern.",
  }),
} as const;

const PatternBoxSchema = Schema.Struct({
  height: Schema.Int,
  width: Schema.Int,
  x: Schema.Int,
  y: Schema.Int,
});

const PatternCandidateSchema = Schema.Struct({
  box: PatternBoxSchema,
  label: Schema.String,
  selector: Schema.String,
  shotPath: Schema.String.annotate({
    description: "Absolute path of a PNG crop of the section.",
  }),
  textSample: Schema.String,
  thumbnail: Schema.NullOr(Schema.String),
});

const PatternImportedSchema = Schema.Struct({
  pattern: PatternDetailSchema,
  referencePath: Schema.String.annotate({
    description:
      "Absolute path of the reference PNG. Pass it to compare_to_reference.",
  }),
});

const PatternProjectFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const PatternListFields = {
  query: Schema.NullOr(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(QUERY_MAX))
  )
    .annotate({
      description: "Text to find in the pattern name, tags and source name.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  tag: Schema.NullOr(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(TAG_MAX))
  )
    .annotate({ description: "Keep only patterns with this tag." })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const PatternCreateFields = {
  name: PatternNameSchema,
  tags: PatternTagsSchema.annotate({
    description: "Short labels such as table, header or form.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
  target: ElementTargetSchema,
  thumbnail: Schema.NullOr(
    Schema.String.check(Schema.isMaxLength(THUMBNAIL_MAX))
  )
    .annotate({
      description: "Optional preview image as a data URL. Leave out for none.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const PatternInsertFields = {
  page: Schema.NullOr(
    Schema.String.check(
      Schema.isMinLength(1),
      Schema.isMaxLength(PAGE_NAME_MAX)
    )
  )
    .annotate({
      description:
        "Insert as a new page with this route, for example reports/table. Give this or target, not both.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  patternId: PatternIdSchema,
  position: PatternPositionSchema.annotate({
    description: "Where to put the pattern next to target. Default inside.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed("inside" as const))),
  target: Schema.NullOr(ElementTargetSchema)
    .annotate({
      description: "The layer to insert at. Give this or page, not both.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const PatternUnmappedSchema = Schema.Struct({
  name: Schema.String,
  reason: Schema.String,
});

const PatternTokenMapSchema = Schema.Struct({
  from: Schema.String,
  note: Schema.String,
  to: Schema.NullOr(Schema.String),
});

const PatternInsertedSchema = Schema.Struct({
  addedImports: Schema.Array(Schema.String),
  dropped: Schema.Array(Schema.String),
  file: Schema.String,
  isNewPage: Schema.Boolean,
  mappedTokens: Schema.Array(PatternTokenMapSchema),
  note: Schema.NullOr(Schema.String),
  patternId: PatternIdSchema,
  route: Schema.NullOr(Schema.String),
  title: Schema.String,
  unmappedImports: Schema.Array(PatternUnmappedSchema),
  unmappedTokens: Schema.Array(PatternUnmappedSchema),
  unresolvedNames: Schema.Array(Schema.String),
  versionId: Schema.NullOr(Schema.String),
});

const PatternDeletedSchema = Schema.Struct({
  id: PatternIdSchema,
  name: PatternNameSchema,
});

const PatternIdFields = { patternId: PatternIdSchema } as const;

export {
  PatternBoxSchema,
  PatternCandidateSchema,
  PatternCreateFields,
  PatternDeletedSchema,
  PatternDetailSchema,
  PatternGetSchema,
  PatternIdFields,
  PatternIdSchema,
  PatternImportedSchema,
  PatternImportFields,
  PatternInspectFields,
  PatternImportSchema,
  PatternInsertedSchema,
  PatternInsertFields,
  PatternKindSchema,
  PatternListFields,
  PatternNameSchema,
  PatternOriginSchema,
  PatternPositionSchema,
  PatternProjectFields,
  PatternSchema,
  PatternTagsSchema,
  PatternTokenMapSchema,
  PatternTokenSchema,
  PatternUnmappedSchema,
  PatternUrlFields,
  PatternUrlSchema,
  PatternWidthSchema,
};

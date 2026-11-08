import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const BLOCK_KINDS = [
  "stats",
  "table",
  "detail-header",
  "form",
  "empty-state",
  "auth",
  "list-detail",
  "page-header",
] as const;

const BLOCK_POSITIONS = ["before", "after", "inside"] as const;

const QUERY_MAX = 80;

const SELECTOR_MAX = 2000;

const SOURCE_MAX = 1000;

const ITEMS_MAX = 60;

const BlockKindSchema = Schema.Literals(BLOCK_KINDS);

const BlockPositionSchema = Schema.Literals(BLOCK_POSITIONS);

const BlockIdSchema = Schema.String.check(
  Schema.isPattern(/^[a-z0-9][a-z0-9-]{0,63}$/u)
);

const BlockNamesSchema = Schema.Array(Schema.String).check(
  Schema.isMaxLength(ITEMS_MAX)
);

const BlockSchema = Schema.Struct({
  components: BlockNamesSchema,
  description: Schema.String,
  id: BlockIdSchema,
  isKitMatched: Schema.Boolean,
  kind: BlockKindSchema,
  missing: BlockNamesSchema,
  name: Schema.String,
  previewPath: Schema.NullOr(Schema.String),
});

const BlockListFields = {
  kind: Schema.NullOr(BlockKindSchema)
    .annotate({ description: "Keep only blocks of this kind." })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  projectId: ProjectIdSchema,
  query: Schema.NullOr(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(QUERY_MAX))
  )
    .annotate({ description: "Text to find in the block name or description." })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const BlockInsertFields = {
  blockId: BlockIdSchema,
  directionId: Schema.NullOr(DirectionIdSchema).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(null))
  ),
  position: BlockPositionSchema.annotate({
    description: "Where to put the block next to the target. Default inside.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed("inside" as const))),
  projectId: ProjectIdSchema,
  targetSelector: Schema.NullOr(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(SELECTOR_MAX))
  )
    .annotate({
      description:
        "A CSS selector for the target element. Leave out this and targetSource to insert at the end of main.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  targetSource: Schema.NullOr(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(SOURCE_MAX))
  )
    .annotate({ description: "A file:line:col source location." })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const BlockInsertedSchema = Schema.Struct({
  fallbacks: BlockNamesSchema,
  imports: Schema.Array(Schema.String).check(Schema.isMaxLength(ITEMS_MAX)),
  layerIds: Schema.Array(Schema.String).check(Schema.isMaxLength(ITEMS_MAX)),
  versionId: Schema.String,
});

export {
  BLOCK_KINDS,
  BLOCK_POSITIONS,
  BlockIdSchema,
  BlockInsertedSchema,
  BlockInsertFields,
  BlockKindSchema,
  BlockListFields,
  BlockSchema,
};

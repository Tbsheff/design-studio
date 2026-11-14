import { Effect, Schema } from "effect";

import { DirectionIdSchema } from "../../_core/ids.js";
import { FrameRefSchema } from "../schema.js";

const PAGE_PATH_MAX = 200;

const PAGES_MAX = 40;

const PagePathSchema = Schema.String.check(Schema.isMaxLength(PAGE_PATH_MAX));

const PageFramesFields = {
  directionId: Schema.NullOr(DirectionIdSchema)
    .annotate({
      description:
        "Direction id. Leave null for the direction that owns the canvas.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  fromFrame: Schema.NullOr(FrameRefSchema)
    .annotate({
      description:
        "Frame id or @label to start from. Leave null to start from every frame.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  pages: Schema.NullOr(
    Schema.Array(PagePathSchema).check(Schema.isMaxLength(PAGES_MAX))
  )
    .annotate({
      description:
        "Page paths that may get a frame, for example plans.html. Leave null for every linked page that has no frame.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const PageFrameSchema = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  page: Schema.String,
});

const PageFramesCreatedSchema = Schema.Struct({
  frames: Schema.Array(PageFrameSchema),
  startFrame: Schema.NullOr(Schema.String),
});

type PageFrame = typeof PageFrameSchema.Type;

type PageFramesCreated = typeof PageFramesCreatedSchema.Type;

export { PageFrameSchema, PageFramesCreatedSchema, PageFramesFields };

export type { PageFrame, PageFramesCreated };

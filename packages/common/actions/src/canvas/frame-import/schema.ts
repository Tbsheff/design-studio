import { Effect, Schema } from "effect";

import { DirectionIdSchema } from "../../_core/ids.js";

const IMPORT_NAME_MAX = 80;

const IMPORT_PROMPT_MAX = 2000;

const ATTACHMENT_ID = /^[\w-]{1,64}$/u;

const FrameImportFields = {
  attachmentId: Schema.String.check(Schema.isPattern(ATTACHMENT_ID)).annotate({
    description:
      "Id of a PNG, JPEG or WebP attachment from create_attachment_project.",
  }),
  directionId: Schema.NullOr(DirectionIdSchema)
    .annotate({
      description:
        "Direction id. Leave null for the direction that owns the canvas.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  name: Schema.NullOr(Schema.String.check(Schema.isMaxLength(IMPORT_NAME_MAX)))
    .annotate({
      description:
        "Name of the new screen, for example Pricing. Leave null to use Imported screen.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  prompt: Schema.NullOr(
    Schema.String.check(Schema.isMaxLength(IMPORT_PROMPT_MAX))
  )
    .annotate({
      description:
        "A note for the run, for example Use our brand colors. Leave null to rebuild the screenshot as it is.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  shouldStartRun: Schema.Boolean.annotate({
    description:
      "true starts a run that rebuilds the screenshot. The in-app agent passes false and writes the page itself.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  x: Schema.NullOr(Schema.Number)
    .annotate({
      description:
        "Canvas x of the new frame. Leave x and y null to put it after the last frame.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  y: Schema.NullOr(Schema.Number)
    .annotate({
      description:
        "Canvas y of the new frame. Leave x and y null to put it after the last frame.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const FrameImportedSchema = Schema.Struct({
  frameId: Schema.String,
  path: Schema.String,
  runId: Schema.NullOr(Schema.String),
});

type FrameImported = typeof FrameImportedSchema.Type;

export { FrameImportedSchema, FrameImportFields };

export type { FrameImported };

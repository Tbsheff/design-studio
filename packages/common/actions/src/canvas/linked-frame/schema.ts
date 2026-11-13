import { Effect, Schema } from "effect";

import { DirectionIdSchema } from "../../_core/ids.js";
import { FrameRefSchema, LinkSelectorSchema } from "../schema.js";

const LINKED_LABEL_MAX = 80;

const LINKED_PATH_MAX = 120;

const LINKED_PROMPT_MAX = 2000;

const LinkedFrameFields = {
  directionId: Schema.NullOr(DirectionIdSchema)
    .annotate({
      description:
        "Direction id. Leave null for the direction that owns the canvas.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  fromFrame: FrameRefSchema.annotate({
    description: "Frame id or @label of the frame that has the element.",
  }),
  label: Schema.NullOr(
    Schema.String.check(Schema.isMaxLength(LINKED_LABEL_MAX))
  )
    .annotate({
      description:
        "Text of the element, for example Book visit. Leave null to read it from the page.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  path: Schema.NullOr(Schema.String.check(Schema.isMaxLength(LINKED_PATH_MAX)))
    .annotate({
      description:
        "Page file for the new screen, for example booking.html. Leave null to make it from the label.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  prompt: Schema.NullOr(
    Schema.String.check(Schema.isMaxLength(LINKED_PROMPT_MAX))
  )
    .annotate({
      description:
        "What the new screen shows. Leave null for a default prompt from the label.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  selector: LinkSelectorSchema.annotate({
    description: "CSS selector of the button or link, for example #book.",
  }),
  shouldStartRun: Schema.Boolean.annotate({
    description:
      "true starts a run that designs the page. The in-app agent passes false and writes the page itself.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
} as const;

const LinkedFrameCreatedSchema = Schema.Struct({
  frameId: Schema.String,
  linkId: Schema.String,
  path: Schema.String,
  runId: Schema.NullOr(Schema.String),
});

type LinkedFrameCreated = typeof LinkedFrameCreatedSchema.Type;

export { LinkedFrameCreatedSchema, LinkedFrameFields };

export type { LinkedFrameCreated };

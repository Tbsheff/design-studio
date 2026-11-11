import {
  RUN_LEVELS,
  VARIATION_BRIEF_MAX,
  VARIATION_DEFAULT,
  VARIATION_MAX,
  VARIATION_MIN,
} from "@design-studio/contracts";
import { Effect, Schema } from "effect";

import { DirectionIdSchema } from "../_core/ids.js";

const PROMPT_MAX = 20_000;

const ATTACHMENT_MAX = 10;

const TITLE_MAX = 40;

const BRIEF_MIN = 12;

const VariationBriefSchema = Schema.Struct({
  brief: Schema.String.check(
    Schema.isMinLength(BRIEF_MIN),
    Schema.isMaxLength(VARIATION_BRIEF_MAX)
  ).annotate({ description: "What makes this variation different." }),
  title: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(TITLE_MAX)
  ).annotate({ description: "A short name for the variation." }),
});

const VariationStartFields = {
  attachmentIds: Schema.Array(Schema.String)
    .check(Schema.isMaxLength(ATTACHMENT_MAX))
    .annotate({
      description:
        "Attachment ids from the project to send to every run. Leave out for none.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
  briefs: Schema.NullOr(Schema.Array(VariationBriefSchema))
    .annotate({
      description:
        "One brief per variation, count items. Leave out or null to let the studio write count briefs from the prompt.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  count: Schema.Int.check(
    Schema.isBetween({ maximum: VARIATION_MAX, minimum: VARIATION_MIN })
  )
    .annotate({
      description: `How many variations to start, ${VARIATION_MIN} to ${VARIATION_MAX} (React projects: at most 3). Ignored when briefs is set.`,
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(VARIATION_DEFAULT))),
  fromDirectionId: Schema.NullOr(DirectionIdSchema)
    .annotate({
      description:
        "Direction to fork each variation from, at its newest version. Leave out or null to start from an empty design.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  level: Schema.NullOr(Schema.Literals(RUN_LEVELS))
    .annotate({
      description:
        "Run level for every variation: wireframe, prototype or polish. Leave out or null for the project default.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  prompt: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PROMPT_MAX)
  ).annotate({ description: "What to design. Every variation gets it." }),
} as const;

const VariationStartItemSchema = Schema.Struct({
  directionId: Schema.NullOr(Schema.String),
  error: Schema.NullOr(Schema.String),
  label: Schema.String,
  name: Schema.NullOr(Schema.String),
  runId: Schema.NullOr(Schema.String),
});

const VariationStartedSchema = Schema.Struct({
  groupId: Schema.String,
  items: Schema.Array(VariationStartItemSchema),
});

export {
  VariationBriefSchema,
  VariationStartFields,
  VariationStartItemSchema,
  VariationStartedSchema,
};

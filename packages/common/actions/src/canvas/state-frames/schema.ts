import { Effect, Schema } from "effect";

import { FrameRefSchema, FrameStateIdSchema } from "../schema.js";

const STATE_BOARD_MAX = 8;

const StateBoardFields = {
  frame: FrameRefSchema.annotate({
    description:
      "Frame id or @label of the page to show in every state. Call canvas_list for the ids.",
  }),
  states: Schema.NullOr(
    Schema.Array(FrameStateIdSchema).check(
      Schema.isMinLength(1),
      Schema.isMaxLength(STATE_BOARD_MAX)
    )
  )
    .annotate({
      description:
        "State ids from list_frame_states (loading, empty, error, session or a custom id). Null for every state except default, at most 8.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const StateFrameSchema = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  state: Schema.String,
});

const StateFramesCreatedSchema = Schema.Struct({
  frames: Schema.Array(StateFrameSchema),
  reusedFrames: Schema.Array(Schema.String),
});

const STATE_CHECK_THRESHOLD = 0.98;

const StateCheckFields = {
  frame: FrameRefSchema.annotate({
    description:
      "Frame id or @label of any frame of the state board, or of its page. Call canvas_list for the ids.",
  }),
  threshold: Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(1)
  )
    .annotate({
      description:
        "Similarity from 0 to 1 at or above which a state looks like the default. Default 0.98.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(STATE_CHECK_THRESHOLD))),
} as const;

const StateCheckItemSchema = Schema.Struct({
  frameId: Schema.String,
  isSameAsDefault: Schema.Boolean,
  label: Schema.String,
  similarity: Schema.Number,
  state: Schema.String,
  stateName: Schema.String,
});

const StateCheckSchema = Schema.Struct({
  items: Schema.Array(StateCheckItemSchema),
  page: Schema.String,
});

export {
  STATE_BOARD_MAX,
  STATE_CHECK_THRESHOLD,
  StateBoardFields,
  StateCheckFields,
  StateCheckItemSchema,
  StateCheckSchema,
  StateFrameSchema,
  StateFramesCreatedSchema,
};

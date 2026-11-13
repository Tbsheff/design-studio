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

export {
  STATE_BOARD_MAX,
  StateBoardFields,
  StateFrameSchema,
  StateFramesCreatedSchema,
};

import {
  START_NAME_MAX,
  START_POINTS_MAX,
} from "@design-studio/contracts/start-points";
import { Schema } from "effect";

const START_FRAME_REF_MAX = 120;

const StartPointSchema = Schema.Struct({
  frame: Schema.String,
  name: Schema.String,
});

const StartPointInputSchema = Schema.Struct({
  frame: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(START_FRAME_REF_MAX)
  ).annotate({ description: "Frame id or @label where this start point is." }),
  name: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(START_NAME_MAX)
  ).annotate({
    description:
      "Start point name shown in the Play menu, for example Sign in. Names are unique.",
  }),
});

const StartPointListInputSchema = Schema.Array(StartPointInputSchema)
  .check(Schema.isMaxLength(START_POINTS_MAX))
  .annotate({
    description:
      "The whole list of start points, 12 at most. The first point is where Play starts. An empty list removes all start points.",
  });

const StartPointsOutputSchema = Schema.Struct({
  starts: Schema.Array(StartPointSchema),
});

export {
  StartPointInputSchema,
  StartPointListInputSchema,
  StartPointSchema,
  StartPointsOutputSchema,
};

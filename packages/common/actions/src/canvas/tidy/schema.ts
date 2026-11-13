import { Effect, Schema } from "effect";

import {
  SectionFrameListSchema,
  SectionIdSchema,
  SectionViewSchema,
} from "../section/schema.js";

const TIDY_GAP_MAX = 2000;

const TIDY_GAP_DEFAULT = 80;

const TidyLayoutSchema = Schema.Literals(["tidy", "row", "grid"]);

const TidyFields = {
  frames: Schema.NullOr(SectionFrameListSchema)
    .annotate({
      description:
        "Frame ids or @labels to move. Null moves every frame, or every frame in the section.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  gap: Schema.Int.check(Schema.isBetween({ maximum: TIDY_GAP_MAX, minimum: 0 }))
    .annotate({ description: "Space between frames in px. Default 80." })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(TIDY_GAP_DEFAULT))),
  layout: TidyLayoutSchema.annotate({
    description:
      "tidy keeps the rows it finds, row makes one line, grid makes a near-square grid. Default tidy.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed("tidy" as const))),
  section: Schema.NullOr(SectionIdSchema)
    .annotate({
      description:
        "Section id. The frames in this section move, and the section fits them. Null for no section.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const TidyFrameSchema = Schema.Struct({
  id: Schema.String,
  x: Schema.Int,
  y: Schema.Int,
});

const FramesTidiedSchema = Schema.Struct({
  layout: TidyLayoutSchema,
  movedFrames: Schema.Array(TidyFrameSchema),
  note: Schema.String,
  section: Schema.NullOr(SectionViewSchema),
});

export {
  FramesTidiedSchema,
  TIDY_GAP_DEFAULT,
  TidyFields,
  TidyFrameSchema,
  TidyLayoutSchema,
};

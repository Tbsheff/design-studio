import { Schema } from "effect";

const GUIDE_COORD_MAX = 100_000;

const GUIDES_MAX = 50;

const GuideAxisSchema = Schema.Literals(["x", "y"]).annotate({
  description:
    "x is a vertical guide at an x position. y is a horizontal guide at a y position.",
});

const GuideSchema = Schema.Struct({
  at: Schema.Finite.check(
    Schema.isBetween({ maximum: GUIDE_COORD_MAX, minimum: -GUIDE_COORD_MAX })
  ).annotate({
    description:
      "Position of the guide in canvas units, the same units as frame x and y in canvas_list.",
  }),
  axis: GuideAxisSchema,
});

const GuideListSchema = Schema.Array(GuideSchema)
  .check(Schema.isMaxLength(GUIDES_MAX))
  .annotate({
    description:
      "The whole list of guides, 50 at most. An empty list removes all guides.",
  });

const GuidesSetSchema = Schema.Struct({
  guides: Schema.Array(GuideSchema),
});

export { GuideListSchema, GuideSchema, GuidesSetSchema };

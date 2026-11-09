import { Schema } from "effect";

const SECTION_ID_PATTERN = /^s\d{1,4}$/u;

const SECTION_LABEL_MAX = 40;

const SECTION_COORD_MAX = 100_000;

const SECTION_SIDE_MIN = 80;

const SECTION_SIDE_MAX = SECTION_COORD_MAX * 2;

const SECTION_FRAME_MAX = 100;

const SECTION_FRAME_REF_MAX = 60;

const SectionIdSchema = Schema.String.check(
  Schema.isPattern(SECTION_ID_PATTERN)
);

const SectionLabelSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(SECTION_LABEL_MAX)
);

const SectionCoordSchema = Schema.Int.check(
  Schema.isBetween({ maximum: SECTION_COORD_MAX, minimum: -SECTION_COORD_MAX })
);

const SectionSideSchema = Schema.Int.check(
  Schema.isBetween({ maximum: SECTION_SIDE_MAX, minimum: SECTION_SIDE_MIN })
);

const SectionFrameListSchema = Schema.Array(
  Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(SECTION_FRAME_REF_MAX)
  )
).check(Schema.isMaxLength(SECTION_FRAME_MAX));

const SectionViewSchema = Schema.Struct({
  height: Schema.Int,
  id: Schema.String,
  label: Schema.String,
  width: Schema.Int,
  x: Schema.Int,
  y: Schema.Int,
});

const SectionSetSchema = Schema.Struct({
  movedFrames: Schema.Array(Schema.String),
  note: Schema.String,
  section: SectionViewSchema,
});

const SectionRemovedSchema = Schema.Struct({
  note: Schema.String,
  removed: Schema.String,
});

export {
  SectionCoordSchema,
  SectionFrameListSchema,
  SectionIdSchema,
  SectionLabelSchema,
  SectionRemovedSchema,
  SectionSetSchema,
  SectionSideSchema,
  SectionViewSchema,
};

import { Schema } from "effect";

const SELECTOR_MAX = 2000;
const PAGE_PATH_MAX = 300;
const FRAME_SIDE_MAX = 4000;

const CopyCodeFormatSchema = Schema.Literals(["html", "tailwind", "react"]);

const CopySelectorSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(SELECTOR_MAX)
);

const PagePathSchema = Schema.String.check(Schema.isMaxLength(PAGE_PATH_MAX));

const FrameSideSchema = Schema.Int.check(
  Schema.isBetween({ maximum: FRAME_SIDE_MAX, minimum: 1 })
);

const CopyCodeResultSchema = Schema.Struct({
  code: Schema.String,
  format: CopyCodeFormatSchema,
});

type CopyCodeResult = typeof CopyCodeResultSchema.Type;

export {
  CopyCodeFormatSchema,
  CopyCodeResultSchema,
  CopySelectorSchema,
  FrameSideSchema,
  PagePathSchema,
};

export type { CopyCodeResult };

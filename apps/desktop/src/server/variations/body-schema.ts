import { RUN_LEVELS, VARIATION_DEFAULT } from "@design-studio/contracts";
import { Effect, Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";

const PROMPT_MAX = 20_000;
const ATTACHMENT_MAX = 10;
const SELECTOR_MAX = 2000;
const TAG_MAX = 100;
const TEXT_MAX = 20_000;
const HTML_MAX = 200_000;
const FILE_MAX = 1000;

const toBoundedText = (max: number): Schema.String =>
  Schema.String.check(Schema.isMaxLength(max));

const toStrings = Schema.mutable(Schema.Array(Schema.String));
const toNullableText = Schema.optional(Schema.NullOr(Schema.String));

const LevelSchema = Schema.optionalKey(Schema.Literals(RUN_LEVELS));

const PromptSchema = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PROMPT_MAX)
);

const RectSchema = Schema.Struct({
  height: Schema.Number,
  width: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
});

const SourceSchema = Schema.Struct({
  col: Schema.Int,
  file: toBoundedText(FILE_MAX),
  line: Schema.Int,
});

const ElementSchema = Schema.Struct({
  ancestors: toStrings,
  outerHTML: toBoundedText(HTML_MAX),
  rect: RectSchema,
  selector: toBoundedText(SELECTOR_MAX),
  source: Schema.NullOr(SourceSchema),
  styles: Schema.Record(Schema.String, Schema.String),
  tag: toBoundedText(TAG_MAX),
  text: toBoundedText(TEXT_MAX),
});

const toOptionalElement = Schema.optional(Schema.NullOr(ElementSchema));

const CountSchema = Schema.Int.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(VARIATION_DEFAULT))
);

const BriefsBody = Schema.Struct({
  count: CountSchema,
  element: toOptionalElement,
  fromDirectionId: toNullableText,
  prompt: PromptSchema,
});

const AttachmentIds = Schema.optionalKey(
  toStrings.check(Schema.isMaxLength(ATTACHMENT_MAX))
);

const StartBody = Schema.Struct({
  attachmentIds: AttachmentIds,
  briefs: Schema.Array(Schema.Unknown),
  element: toOptionalElement,
  fromDirectionId: toNullableText,
  level: LevelSchema,
  prompt: PromptSchema,
});

const KeepBody = Schema.Struct({ directionId: Schema.String });

const MixBody = Schema.Struct({
  element: ElementSchema,
  fromDirectionId: Schema.String,
  level: LevelSchema,
  prompt: Schema.optionalKey(toBoundedText(PROMPT_MAX)),
  toDirectionId: Schema.String,
});

const decodeBriefsBody = toDecoder(BriefsBody, "ignore");
const decodeStartBody = toDecoder(StartBody, "ignore");
const decodeKeepBody = toDecoder(KeepBody, "ignore");
const decodeMixBody = toDecoder(MixBody, "ignore");

export {
  PROMPT_MAX,
  decodeBriefsBody,
  decodeKeepBody,
  decodeMixBody,
  decodeStartBody,
};

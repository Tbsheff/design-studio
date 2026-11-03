import { Schema } from "effect";

const PROMPT_MAX = 500;

const SEED_MAX = 9;

const ImageAspectSchema = Schema.Literals(["square", "wide", "tall", "hero"]);

const ImageStyleSchema = Schema.Literals([
  "photo",
  "illustration",
  "icon",
  "abstract",
]);

const ImageProviderSchema = Schema.Literals(["mock", "openai", "gemini"]);

const ImageLayerSchema = Schema.Struct({
  background: Schema.optionalKey(Schema.Boolean),
  html: Schema.optionalKey(Schema.String),
  selector: Schema.optionalKey(Schema.String),
  source: Schema.NullOr(
    Schema.Struct({
      col: Schema.Int,
      file: Schema.String,
      line: Schema.Int,
    })
  ),
  tag: Schema.String,
});

const ImageCreateFields = {
  aspect: Schema.optionalKey(ImageAspectSchema),
  layer: Schema.optionalKey(ImageLayerSchema),
  prompt: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PROMPT_MAX)
  ),
  reuse: Schema.optionalKey(
    Schema.String.annotate({
      description:
        "Asset path from an earlier image.create result. Places that file and skips generation.",
    })
  ),
  seed: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ maximum: SEED_MAX, minimum: 0 }))
  ),
  style: Schema.optionalKey(ImageStyleSchema),
} as const;

const ImageCreatedSchema = Schema.Struct({
  alt: Schema.String,
  asset: Schema.String,
  isMock: Schema.Boolean,
  placed: Schema.Boolean,
  preview: Schema.String,
  provider: ImageProviderSchema,
  src: Schema.NullOr(Schema.String),
  versionId: Schema.NullOr(Schema.String),
});

const ImageStatusSchema = Schema.Struct({
  isMock: Schema.Boolean,
  isReady: Schema.Boolean,
  message: Schema.NullOr(Schema.String),
  provider: ImageProviderSchema,
});

export {
  ImageAspectSchema,
  ImageCreatedSchema,
  ImageCreateFields,
  ImageLayerSchema,
  ImageProviderSchema,
  ImageStatusSchema,
  ImageStyleSchema,
};

import { Effect, Schema } from "effect";

const PROMPT_MAX = 500;

const SEED_MAX = 9;

const OWNER_NAME_MAX = 64;

const OWNER_STACK_MAX = 2000;

const OWNERS_MAX = 20;

const ImageAspectSchema = Schema.Literals(["square", "wide", "tall", "hero"]);

const ImageStyleSchema = Schema.Literals([
  "photo",
  "illustration",
  "icon",
  "abstract",
]);

const ImageProviderSchema = Schema.Literals(["mock", "openai", "gemini"]);

const ImageLayerOwnerSchema = Schema.Struct({
  name: Schema.String.check(Schema.isMaxLength(OWNER_NAME_MAX)),
  stack: Schema.String.check(Schema.isMaxLength(OWNER_STACK_MAX)),
});

const ImageLayerOwnersSchema = Schema.Array(ImageLayerOwnerSchema).check(
  Schema.isMaxLength(OWNERS_MAX)
);

const ImageLayerSchema = Schema.Struct({
  background: Schema.optionalKey(Schema.Boolean),
  html: Schema.optionalKey(Schema.String),
  owners: Schema.optionalKey(ImageLayerOwnersSchema),
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
  aspect: ImageAspectSchema.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("square" as const))
  ),
  layer: Schema.NullOr(ImageLayerSchema).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(null))
  ),
  prompt: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PROMPT_MAX)
  ),
  reuse: Schema.NullOr(Schema.String)
    .annotate({
      description:
        "Asset path from an earlier image.create result. Places that file and skips generation.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  seed: Schema.Int.check(
    Schema.isBetween({ maximum: SEED_MAX, minimum: 0 })
  ).pipe(Schema.withDecodingDefaultKey(Effect.succeed(0))),
  style: ImageStyleSchema.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("photo" as const))
  ),
} as const;

const ImageEditModeSchema = Schema.Literals([
  "remove-background",
  "upscale",
  "prompt",
  "expand",
]);

const ImageExpandAspectSchema = Schema.Literals([
  "1:1",
  "4:3",
  "16:9",
  "9:16",
  "3:2",
  "fill",
]);

const ImageBoxSchema = Schema.Struct({
  height: Schema.Int.check(Schema.isGreaterThan(0)),
  width: Schema.Int.check(Schema.isGreaterThan(0)),
});

const ImageEditFields = {
  aspect: Schema.NullOr(ImageExpandAspectSchema).annotate({
    description:
      "Target shape for the expand mode: 1:1, 4:3, 16:9, 9:16, 3:2 or fill (match the layer box). Required for the expand mode. Null for the other modes.",
  }),
  box: Schema.NullOr(ImageBoxSchema)
    .annotate({
      description:
        "Layer box in pixels. Used by the expand mode with aspect fill. Null otherwise.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  layer: ImageLayerSchema,
  mode: ImageEditModeSchema,
  prompt: Schema.NullOr(
    Schema.String.check(Schema.isMaxLength(PROMPT_MAX))
  ).annotate({
    description:
      "What to change in the image. Required for the prompt mode. Null for the other modes.",
  }),
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
  ImageBoxSchema,
  ImageCreatedSchema,
  ImageCreateFields,
  ImageEditFields,
  ImageEditModeSchema,
  ImageExpandAspectSchema,
  ImageLayerSchema,
  ImageProviderSchema,
  ImageStatusSchema,
  ImageStyleSchema,
};

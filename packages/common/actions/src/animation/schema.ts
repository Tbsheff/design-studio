import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const MAX_DURATION_MS = 120_000;

const MAX_TRACKS = 24;

const MAX_PROPERTIES = 12;

const MAX_KEYFRAMES = 32;

const MAX_TEXT = 200;

const MAX_NAME = 80;

const SAFE_TEXT = /^[^{};<>@\\]*$/u;

const SAFE_SELECTOR = /^[^{};<>@\\,]+$/u;

const PROPERTY_NAME = /^-?[a-z][a-z-]{0,48}$/u;

const EASING =
  /^(?:linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier\(-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?){3}\))$/u;

const AnimationIdSchema = Schema.String.check(
  Schema.isPattern(/^[a-z0-9][a-z0-9-]{0,39}$/u)
);

const AnimationTriggerSchema = Schema.Literals([
  "load",
  "hover",
  "click",
  "in-view",
  "scroll",
]);

const AnimationLoopSchema = Schema.Literals(["once", "infinite", "alternate"]);

const AnimationEasingSchema = Schema.String.check(Schema.isPattern(EASING));

const AnimationExportFormatSchema = Schema.Literals(["css", "react", "webm"]);

const AnimationKeyframeSchema = Schema.Struct({
  easing: AnimationEasingSchema,
  timeMs: Schema.Int.check(
    Schema.isBetween({ maximum: MAX_DURATION_MS, minimum: 0 })
  ),
  value: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(MAX_TEXT),
    Schema.isPattern(SAFE_TEXT)
  ),
});

const AnimationPropertyTrackSchema = Schema.Struct({
  keyframes: Schema.Array(AnimationKeyframeSchema).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(MAX_KEYFRAMES)
  ),
  property: Schema.String.check(Schema.isPattern(PROPERTY_NAME)),
});

const AnimationTrackSchema = Schema.Struct({
  delayMs: Schema.Int.check(
    Schema.isBetween({ maximum: MAX_DURATION_MS, minimum: 0 })
  ),
  properties: Schema.Array(AnimationPropertyTrackSchema).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(MAX_PROPERTIES)
  ),
  selector: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(MAX_TEXT),
    Schema.isPattern(SAFE_SELECTOR)
  ),
});

const AnimationNameSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(MAX_NAME),
  Schema.isPattern(SAFE_TEXT)
);

const AnimationDurationSchema = Schema.Int.check(
  Schema.isBetween({ maximum: MAX_DURATION_MS, minimum: 50 })
);

const AnimationTracksSchema = Schema.Array(AnimationTrackSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(MAX_TRACKS)
);

const AnimationSchema = Schema.Struct({
  durationMs: AnimationDurationSchema,
  file: Schema.String,
  id: AnimationIdSchema,
  loop: AnimationLoopSchema,
  name: AnimationNameSchema,
  tracks: AnimationTracksSchema,
  trigger: AnimationTriggerSchema,
});

const AnimationDetailSchema = Schema.Struct({
  animation: AnimationSchema,
});

const AnimationSummarySchema = Schema.Struct({
  durationMs: Schema.Int,
  file: Schema.String,
  id: AnimationIdSchema,
  loop: AnimationLoopSchema,
  name: Schema.String,
  trackCount: Schema.Int,
  trigger: AnimationTriggerSchema,
});

const AnimationChangeSchema = Schema.Struct({
  animation: AnimationSchema,
  files: Schema.Array(Schema.String),
  title: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const AnimationRemovedSchema = Schema.Struct({
  files: Schema.Array(Schema.String),
  id: AnimationIdSchema,
  name: Schema.String,
  title: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const AnimationExportSchema = Schema.Struct({
  bytes: Schema.Int,
  code: Schema.NullOr(Schema.String),
  format: AnimationExportFormatSchema,
  mimeType: Schema.String,
  notes: Schema.Array(Schema.String),
  path: Schema.NullOr(Schema.String),
});

const AnimationTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
};

const AnimationRefFields = {
  ...AnimationTargetFields,
  animationId: AnimationIdSchema,
};

const AnimationFileFieldSchema = Schema.NullOr(Schema.String).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(null))
);

const AnimationLoopFieldSchema = AnimationLoopSchema.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("once" as const))
);

export {
  AnimationChangeSchema,
  AnimationDetailSchema,
  AnimationDurationSchema,
  AnimationExportFormatSchema,
  AnimationExportSchema,
  AnimationFileFieldSchema,
  AnimationIdSchema,
  AnimationLoopFieldSchema,
  AnimationLoopSchema,
  AnimationNameSchema,
  AnimationRefFields,
  AnimationRemovedSchema,
  AnimationSchema,
  AnimationSummarySchema,
  AnimationTargetFields,
  AnimationTracksSchema,
  AnimationTriggerSchema,
  MAX_DURATION_MS,
};

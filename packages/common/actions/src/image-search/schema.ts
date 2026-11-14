import {
  IMAGE_ALT_MAX,
  IMAGE_FITS,
  IMAGE_MODES,
} from "@design-studio/contracts/image";
import {
  IMAGE_ORIENTATIONS,
  IMAGE_QUERY_MAX,
  IMAGE_SEARCH_LIMIT_DEFAULT,
  IMAGE_SEARCH_LIMIT_MAX,
} from "@design-studio/contracts/image-search";
import { Effect, Schema } from "effect";

import { ElementSourceSchema } from "../_core/element-target.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const FOCAL_MAX = 40;

const IMAGE_ID_MAX = 64;

const OWNER_NAME_MAX = 64;

const OWNERS_MAX = 20;

const SELECTOR_MAX = 2000;

const TAG_MAX = 100;

const HTML_MAX = 4000;

const PAGE_PATH_MAX = 500;

const SLOTS_MAX = 50;

const ImageSearchProjectFields = {
  projectId: ProjectIdSchema.annotate({
    description:
      "Project id from list_projects. Its imageSearch setting can turn the search on.",
  }),
} as const;

const ImageSearchDirectionFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const ImageOrientationSchema = Schema.Literals(IMAGE_ORIENTATIONS);

const ImageSearchLimitSchema = Schema.Int.check(
  Schema.isBetween({ maximum: IMAGE_SEARCH_LIMIT_MAX, minimum: 1 })
)
  .annotate({
    description: `Number of results, 1 to ${IMAGE_SEARCH_LIMIT_MAX}.`,
  })
  .pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(IMAGE_SEARCH_LIMIT_DEFAULT))
  );

const ImageSearchOrientationFieldSchema = ImageOrientationSchema.annotate({
  description: "any (default), wide, tall or square.",
}).pipe(Schema.withDecodingDefaultKey(Effect.succeed("any" as const)));

const ImageSearchQuerySchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(IMAGE_QUERY_MAX)
).annotate({
  description: 'Search words only, for example "mountain lake sunrise".',
});

const ImageSearchInspectFields = {
  limit: ImageSearchLimitSchema,
  orientation: ImageSearchOrientationFieldSchema,
  query: ImageSearchQuerySchema,
} as const;

const ImageOwnerSchema = Schema.Struct({
  name: Schema.String.check(Schema.isMaxLength(OWNER_NAME_MAX)),
  stack: Schema.String.check(Schema.isMaxLength(SELECTOR_MAX)),
});

const ImageOwnersSchema = Schema.Array(ImageOwnerSchema).check(
  Schema.isMaxLength(OWNERS_MAX)
);

const ImageHtmlSchema = Schema.String.check(Schema.isMaxLength(HTML_MAX));

const ImageSelectorSchema = Schema.String.check(
  Schema.isMaxLength(SELECTOR_MAX)
);

const ImageTargetSchema = Schema.Struct({
  background: Schema.optionalKey(Schema.Boolean),
  html: Schema.optionalKey(ImageHtmlSchema),
  owners: Schema.optionalKey(ImageOwnersSchema),
  selector: Schema.optionalKey(Schema.NullOr(ImageSelectorSchema)),
  source: Schema.optionalKey(Schema.NullOr(ElementSourceSchema)),
  tag: Schema.String.check(Schema.isMaxLength(TAG_MAX)),
}).annotate({
  description:
    "The layer to set: source (file, line, col of its tag) and tag, as get_layers prints them. selector is the CSS selector or layer id.",
});

const ImageFitSchema = Schema.Literals(IMAGE_FITS).annotate({
  description: "cover crops to fill, contain shows all of it, fill stretches.",
});

const ImageFocalSchema = Schema.String.check(
  Schema.isMaxLength(FOCAL_MAX)
).annotate({
  description: 'Focal point as "x% y%", for example "50% 30%".',
});

const ImageModeSchema = Schema.Literals(IMAGE_MODES).annotate({
  description:
    "auto (default): img for an <img>, background for an element with a background image, insert for others. background sets a background image on any element.",
});

const ImagePositionSchema = Schema.Literals(["inside", "after"]).annotate({
  description: "For insert: inside the element (default) or after it.",
});

const ImageSearchInsertFields = {
  alt: Schema.String.check(Schema.isMaxLength(IMAGE_ALT_MAX)).annotate({
    description: 'Alt text of the photo. "" marks it as decorative.',
  }),
  fit: Schema.optionalKey(Schema.NullOr(ImageFitSchema)),
  focal: Schema.optionalKey(Schema.NullOr(ImageFocalSchema)),
  imageId: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(IMAGE_ID_MAX)
  ).annotate({ description: "The id of one search_images result." }),
  mode: Schema.optionalKey(Schema.NullOr(ImageModeSchema)),
  position: Schema.optionalKey(Schema.NullOr(ImagePositionSchema)),
  target: ImageTargetSchema,
} as const;

const ImageSearchStatusSchema = Schema.Struct({
  env: Schema.Boolean,
  message: Schema.NullOr(Schema.String),
  on: Schema.Boolean,
  setting: Schema.Boolean,
});

const ImageSearchHitSchema = Schema.Struct({
  author: Schema.NullOr(Schema.String),
  authorUrl: Schema.NullOr(Schema.String),
  fullUrl: Schema.String,
  height: Schema.NullOr(Schema.Number),
  id: Schema.String,
  license: Schema.String,
  licenseUrl: Schema.NullOr(Schema.String),
  provider: Schema.NullOr(Schema.String),
  sourceUrl: Schema.NullOr(Schema.String),
  thumbnailUrl: Schema.NullOr(Schema.String),
  title: Schema.NullOr(Schema.String),
  width: Schema.NullOr(Schema.Number),
});

const ImageSearchResultSchema = Schema.Struct({
  count: Schema.Number,
  orientation: ImageOrientationSchema,
  query: Schema.String,
  results: Schema.Array(ImageSearchHitSchema),
});

const ImagePlacedSelectionSchema = Schema.Struct({
  col: Schema.Number,
  file: Schema.String,
  line: Schema.Number,
  tag: Schema.String,
});

const ImagePlacedSchema = Schema.Struct({
  asset: Schema.NullOr(Schema.String),
  changed: Schema.Boolean,
  credit: Schema.String,
  creditFile: Schema.String,
  file: Schema.String,
  imageId: Schema.String,
  mode: Schema.Literals(["img", "background", "insert"]),
  select: Schema.NullOr(Schema.Array(ImagePlacedSelectionSchema)),
  src: Schema.NullOr(Schema.String),
  title: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const ImageSearchApplyFields = {
  path: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PAGE_PATH_MAX)
  ).annotate({
    description:
      'The page file, relative to the project folder, for example "index.html".',
  }),
  slots: Schema.NullOr(
    Schema.Array(ImageSearchQuerySchema).check(Schema.isMaxLength(SLOTS_MAX))
  )
    .annotate({
      description:
        "The data-photo words of missed slots to search again. A slot with data-photo-missed is skipped unless its words are in this list. Default null.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const PhotoSlotMissSchema = Schema.Struct({
  query: Schema.String,
  selector: Schema.String,
});

const PhotoSlotFillSchema = Schema.Struct({
  photoId: Schema.String,
  query: Schema.String,
  selector: Schema.String,
});

const PhotoFillSchema = Schema.Struct({
  filled: Schema.Array(PhotoSlotFillSchema),
  missed: Schema.Array(PhotoSlotMissSchema),
  note: Schema.NullOr(Schema.String),
  versionId: Schema.NullOr(Schema.String),
});

export {
  ImagePlacedSchema,
  ImageSearchApplyFields,
  PhotoFillSchema,
  ImageSearchDirectionFields,
  ImageSearchInspectFields,
  ImageSearchInsertFields,
  ImageSearchProjectFields,
  ImageSearchResultSchema,
  ImageSearchStatusSchema,
};

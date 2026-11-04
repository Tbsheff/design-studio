import {
  IMAGE_ALT_MAX,
  IMAGE_FITS,
  IMAGE_MODES,
  IMAGE_ORIENTATIONS,
  IMAGE_QUERY_MAX,
  IMAGE_SEARCH_LIMIT_MAX,
  z,
} from "./deps.js";

const FOCAL_MAX = 40;

const IMAGE_ID_MAX = 64;

const searchImagesFields = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(IMAGE_SEARCH_LIMIT_MAX)
    .optional()
    .describe(`Number of results, 1 to ${IMAGE_SEARCH_LIMIT_MAX}.`),
  orientation: z
    .enum(IMAGE_ORIENTATIONS)
    .optional()
    .describe("any (default), wide, tall or square."),
  query: z
    .string()
    .trim()
    .min(1)
    .max(IMAGE_QUERY_MAX)
    .describe('Search words only, for example "mountain lake sunrise".'),
};

const placeImageFields = {
  alt: z
    .string()
    .max(IMAGE_ALT_MAX)
    .describe('Alt text of the photo. "" marks it as decorative.'),
  fit: z
    .enum(IMAGE_FITS)
    .optional()
    .describe("cover crops to fill, contain shows all of it, fill stretches."),
  focal: z
    .string()
    .trim()
    .max(FOCAL_MAX)
    .optional()
    .describe('Focal point as "x% y%", for example "50% 30%".'),
  imageId: z
    .string()
    .trim()
    .min(1)
    .max(IMAGE_ID_MAX)
    .describe("The id of one search_images result."),
  mode: z
    .enum(IMAGE_MODES)
    .optional()
    .describe(
      "auto (default): img for an <img>, background for an element with a background image, insert for others. background sets a background image on any element."
    ),
  position: z
    .enum(["inside", "after"])
    .optional()
    .describe("For insert: inside the element (default) or after it."),
};

export { placeImageFields, searchImagesFields };

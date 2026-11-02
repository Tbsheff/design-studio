import { z } from "zod";

import {
  IMAGE_ALT_MAX,
  IMAGE_FITS,
  IMAGE_MODES,
  IMAGE_ORIENTATIONS,
  IMAGE_QUERY_MAX,
  IMAGE_SEARCH_LIMIT_DEFAULT,
  IMAGE_SEARCH_LIMIT_MAX,
} from "./deps.js";
import type { ImageSearchRequest, PlaceImageInput } from "./deps.js";

const FOCAL_MAX = 40;

const IMAGE_ID_MAX = 64;

const SEARCH_IMAGES_DESCRIPTION =
  "Search free stock photos with Creative Commons licenses (Openverse, no key). query is the search words only; the studio sends no other project data. orientation is any, wide, tall or square; limit is 1 to 30 (default 12). Each result has id, thumbnailUrl, fullUrl, width, height, author, license, licenseUrl and sourceUrl. Pass a result id to place_image. The network is off until STUDIO_IMAGE_SEARCH=on or the project setting imageSearch is true.";

const PLACE_IMAGE_DESCRIPTION =
  "Place one search_images result on a layer as one version. The studio downloads the photo by its id, copies it into the project assets folder with a content-hashed name, sets it with the set_image code (src on an <img>, background-image on an element with a background image or with mode background, or a new <img> inside other elements), writes alt, and adds the author, license and source link to ASSETS.md. One undo step. Needs the same image search setting as search_images.";

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

interface SearchFieldsInput {
  readonly limit?: number | undefined;
  readonly orientation?: ImageSearchRequest["orientation"] | undefined;
  readonly query: string;
}

interface PlaceFieldsInput {
  readonly alt: string;
  readonly fit?: PlaceImageInput["fit"] | undefined;
  readonly focal?: string | undefined;
  readonly imageId: string;
  readonly mode?: PlaceImageInput["mode"] | undefined;
  readonly position?: PlaceImageInput["position"] | undefined;
}

const toSearchRequest = (input: SearchFieldsInput): ImageSearchRequest => ({
  limit: input.limit ?? IMAGE_SEARCH_LIMIT_DEFAULT,
  orientation: input.orientation ?? "any",
  query: input.query,
});

const toPlaceInput = (input: PlaceFieldsInput): PlaceImageInput => ({
  alt: input.alt,
  fit: input.fit ?? null,
  focal: input.focal ?? null,
  imageId: input.imageId,
  mode: input.mode ?? null,
  position: input.position ?? null,
});

export {
  PLACE_IMAGE_DESCRIPTION,
  placeImageFields,
  SEARCH_IMAGES_DESCRIPTION,
  searchImagesFields,
  toPlaceInput,
  toSearchRequest,
};

export type { PlaceFieldsInput, SearchFieldsInput };

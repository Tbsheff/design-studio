import { IMAGE_SEARCH_LIMIT_DEFAULT } from "./deps.js";
import type { ImageSearchRequest, PlaceImageInput } from "./deps.js";

const SEARCH_IMAGES_DESCRIPTION =
  "Search free stock photos with Creative Commons licenses (Openverse, no key). query is the search words only; the studio sends no other project data. orientation is any, wide, tall or square; limit is 1 to 30 (default 12). Each result has id, thumbnailUrl, fullUrl, width, height, author, license, licenseUrl and sourceUrl. Pass a result id to place_image. The network is off until STUDIO_IMAGE_SEARCH=on or the project setting imageSearch is true.";

const PLACE_IMAGE_DESCRIPTION =
  "Place one search_images result on a layer as one version. The studio downloads the photo by its id, copies it into the project assets folder with a content-hashed name, sets it with the set_image code (src on an <img>, background-image on an element with a background image or with mode background, or a new <img> inside other elements), writes alt, and adds the author, license and source link to ASSETS.md. One undo step. Needs the same image search setting as search_images.";

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
  SEARCH_IMAGES_DESCRIPTION,
  toPlaceInput,
  toSearchRequest,
};

export type { PlaceFieldsInput, SearchFieldsInput };

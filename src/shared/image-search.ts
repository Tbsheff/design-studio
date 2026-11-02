import type { SourceLoc, Version } from "./contracts.js";
import type { ImageFit, ImageMode } from "./image.js";

const IMAGE_ORIENTATIONS = ["any", "wide", "tall", "square"] as const;

const IMAGE_SEARCH_LIMIT_MAX = 30;

const IMAGE_SEARCH_LIMIT_DEFAULT = 12;

const IMAGE_QUERY_MAX = 200;

const IMAGE_SEARCH_ENV = "STUDIO_IMAGE_SEARCH";

const IMAGE_SEARCH_SETTING = "imageSearch";

const ASSETS_FILE = "ASSETS.md";

type ImageOrientation = (typeof IMAGE_ORIENTATIONS)[number];

interface ImageSearchHit {
  readonly author: string | null;
  readonly authorUrl: string | null;
  readonly fullUrl: string;
  readonly height: number | null;
  readonly id: string;
  readonly license: string;
  readonly licenseUrl: string | null;
  readonly provider: string | null;
  readonly sourceUrl: string | null;
  readonly thumbnailUrl: string | null;
  readonly title: string | null;
  readonly width: number | null;
}

interface ImageSearchRequest {
  readonly limit: number;
  readonly orientation: ImageOrientation;
  readonly query: string;
}

interface ImageSearchResult {
  readonly count: number;
  readonly orientation: ImageOrientation;
  readonly query: string;
  readonly results: readonly ImageSearchHit[];
}

interface PlaceImageInput {
  readonly alt: string;
  readonly fit: ImageFit | null;
  readonly focal: string | null;
  readonly imageId: string;
  readonly mode: ImageMode | null;
  readonly position: "after" | "inside" | null;
}

interface PlaceImageResult {
  readonly asset: string | null;
  readonly changed: boolean;
  readonly credit: string;
  readonly creditFile: string;
  readonly file: string;
  readonly imageId: string;
  readonly mode: Exclude<ImageMode, "auto">;
  readonly select: readonly (SourceLoc & { tag: string })[] | null;
  readonly src: string | null;
  readonly title: string;
  readonly versionId: string | null;
}

interface PlaceImageDone {
  readonly result: PlaceImageResult;
  readonly version: Version | null;
}

export {
  ASSETS_FILE,
  IMAGE_ORIENTATIONS,
  IMAGE_QUERY_MAX,
  IMAGE_SEARCH_ENV,
  IMAGE_SEARCH_LIMIT_DEFAULT,
  IMAGE_SEARCH_LIMIT_MAX,
  IMAGE_SEARCH_SETTING,
};

export type {
  ImageOrientation,
  ImageSearchHit,
  ImageSearchRequest,
  ImageSearchResult,
  PlaceImageDone,
  PlaceImageInput,
  PlaceImageResult,
};

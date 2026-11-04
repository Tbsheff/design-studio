import { imageTargetOf, json } from "./deps.js";
import type {
  ImageOrientation,
  ImageSearchResult,
  PlaceImageResult,
  SelectionContext,
} from "./deps.js";

interface PhotoIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface SearchStatus {
  readonly env: boolean;
  readonly message: string | null;
  readonly on: boolean;
  readonly setting: boolean;
}

interface PlaceRequest {
  readonly alt: string;
  readonly imageId: string;
  readonly target: SelectionContext;
}

const projectPath = (ids: PhotoIds): string =>
  `/api/projects/${encodeURIComponent(ids.projectId)}/image-search`;

const readStatus = (ids: PhotoIds): Promise<SearchStatus> =>
  json<SearchStatus>("GET", projectPath(ids));

const writeSetting = (ids: PhotoIds, isOn: boolean): Promise<SearchStatus> =>
  json<SearchStatus>("POST", `${projectPath(ids)}/setting`, { on: isOn });

const searchPhotos = (
  ids: PhotoIds,
  query: string,
  orientation: ImageOrientation
): Promise<ImageSearchResult> => {
  const params = new URLSearchParams({ limit: "24", orientation, query });

  return json<ImageSearchResult>(
    "GET",
    `${projectPath(ids)}/photos?${params.toString()}`
  );
};

const placePhoto = (
  ids: PhotoIds,
  request: PlaceRequest
): Promise<PlaceImageResult> =>
  json<PlaceImageResult>(
    "POST",
    `/api/projects/${encodeURIComponent(ids.projectId)}/d/${encodeURIComponent(ids.directionId)}/image-search/place`,
    {
      alt: request.alt,
      imageId: request.imageId,
      target: imageTargetOf(request.target),
    }
  );

export { placePhoto, readStatus, searchPhotos, writeSetting };

export type { PhotoIds, PlaceRequest, SearchStatus };

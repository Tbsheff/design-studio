import {
  call,
  imageSearchRoutes,
  imageTargetOf,
  projectRoutes,
} from "./deps.js";
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

const PHOTO_LIMIT = 24;

const readStatus = (ids: PhotoIds): Promise<SearchStatus> =>
  call(imageSearchRoutes.getImageSearch, { projectId: ids.projectId });

const writeSetting = async (
  ids: PhotoIds,
  isOn: boolean
): Promise<SearchStatus> => {
  await call(projectRoutes.updateProject, {
    imageSearch: isOn,
    projectId: ids.projectId,
  });

  return readStatus(ids);
};

const searchPhotos = (
  ids: PhotoIds,
  query: string,
  kind: ImageOrientation
): Promise<ImageSearchResult> =>
  call(imageSearchRoutes.inspectImageSearch, {
    limit: PHOTO_LIMIT,
    orientation: kind,
    projectId: ids.projectId,
    query,
  });

const placePhoto = (
  ids: PhotoIds,
  request: PlaceRequest
): Promise<PlaceImageResult> =>
  call(imageSearchRoutes.insertImageSearch, {
    alt: request.alt,
    directionId: ids.directionId,
    imageId: request.imageId,
    projectId: ids.projectId,
    target: imageTargetOf(request.target),
  });

export { placePhoto, readStatus, searchPhotos, writeSetting };

export type { PhotoIds, PlaceRequest, SearchStatus };

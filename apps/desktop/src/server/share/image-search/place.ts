import { planCredit } from "./credit.js";
import type { CreditEdit } from "./credit.js";
import {
  assertCanEdit,
  DirectEditError,
  imageFromUrl,
  parseSetImage,
  planChanged,
  planSetImage,
  publishVersion,
  saveDeferred,
  savesSettled,
  writeAtomic,
  writeImagePlan,
  writeNewFile,
} from "./deps.js";
import type {
  DirectEditDeps,
  Direction,
  ImageBytes,
  ImageFit,
  ImageMode,
  ImagePlan,
  ImageSearchHit,
  InsertScope,
  PlaceImageDone,
  PlaceImageInput,
  PlaceImageResult,
  Version,
  VersionMeta,
} from "./deps.js";
import { ImageSearchError } from "./errors.js";
import { requireImageSearch } from "./gate.js";
import { getOpenverseImage } from "./openverse.js";
import type { PlaceTarget } from "./target.js";

interface PlaceScope extends InsertScope {
  readonly direction: Direction;
}

interface PlacePlan {
  readonly credit: CreditEdit;
  readonly hit: ImageSearchHit;
  readonly image: ImagePlan;
}

interface PlaceRequest {
  alt?: string;
  fit?: ImageFit;
  focal?: string;
  mode?: ImageMode;
  position?: "after" | "inside";
  target: PlaceTarget;
}

const toFetchFrom = async (url: string | null): Promise<ImageBytes | null> => {
  if (url === null || !url.startsWith("https://")) {
    return null;
  }

  try {
    return await imageFromUrl(url);
  } catch {
    return null;
  }
};

const toFetchImage = async (hit: ImageSearchHit): Promise<ImageBytes> => {
  const full = await toFetchFrom(hit.fullUrl);

  if (full !== null) {
    return full;
  }

  const thumbnail = await toFetchFrom(hit.thumbnailUrl);

  if (thumbnail !== null) {
    return thumbnail;
  }

  throw new ImageSearchError(
    "The studio could not download this image. Choose a different result."
  );
};

const isBackground = (input: PlaceImageInput, target: PlaceTarget): boolean =>
  input.mode === "background" ||
  (input.mode !== "img" && target.background === true);

const toRequestOf = (
  input: PlaceImageInput,
  target: PlaceTarget
): PlaceRequest => {
  const request: PlaceRequest = { target };

  if (input.mode !== null) {
    request.mode = input.mode;
  }

  if (input.fit !== null) {
    request.fit = input.fit;
  }

  if (input.focal !== null) {
    request.focal = input.focal;
  }

  if (input.position !== null) {
    request.position = input.position;
  }

  if (!isBackground(input, target)) {
    request.alt = input.alt;
  }

  return request;
};

const toPlanPlaceImage = async (
  scope: InsertScope,
  input: PlaceImageInput,
  target: PlaceTarget
): Promise<PlacePlan> => {
  requireImageSearch(scope.project);

  const request = parseSetImage(toRequestOf(input, target));
  const hit = await getOpenverseImage(input.imageId);
  const bytes = await toFetchImage(hit);
  const image = await planSetImage(scope, request, bytes);
  const asset = image.asset?.relative ?? null;
  const credit = await planCredit(scope.workTree, hit, asset);

  return { credit, hit, image };
};

const toPlaceFiles = (plan: PlacePlan): string[] => {
  const files = [plan.image.target.relative];

  if (plan.image.asset) {
    files.push(plan.image.asset.relative);
  }

  files.push(plan.credit.relative);

  return files;
};

const isPlaceChanged = (plan: PlacePlan): boolean =>
  planChanged(plan.image) || plan.credit.code !== plan.credit.original;

const toWriteCredit = async (credit: CreditEdit): Promise<void> => {
  if (credit.code === credit.original) {
    return;
  }

  if (credit.exists) {
    await writeAtomic(credit.file, credit.code);

    return;
  }

  await writeNewFile(credit.file, credit.code);
};

const toWritePlacePlan = async (plan: PlacePlan): Promise<void> => {
  await writeImagePlan(plan.image);
  await toWriteCredit(plan.credit);
};

const toPlaceResult = (
  plan: PlacePlan,
  version: Version | null
): PlaceImageResult => ({
  asset: plan.image.asset?.relative ?? null,
  changed: isPlaceChanged(plan),
  credit: plan.credit.line,
  creditFile: plan.credit.relative,
  file: plan.image.target.relative,
  imageId: plan.hit.id,
  mode: plan.image.mode,
  select: plan.image.select ?? null,
  src: plan.image.asset?.src ?? null,
  title: plan.image.title,
  versionId: version?.id ?? null,
});

const toRecordHistory = (
  deps: DirectEditDeps,
  scope: PlaceScope,
  plan: PlacePlan,
  version: Version
): void => {
  deps.history?.record({
    directionId: scope.direction.id,
    files: [
      {
        after: plan.image.code,
        before: plan.image.original,
        file: plan.image.target.file,
        relative: plan.image.target.relative,
      },
      {
        after: plan.credit.code,
        before: plan.credit.original,
        file: plan.credit.file,
        relative: plan.credit.relative,
      },
    ],
    label: version.title,
    projectId: scope.project.id,
    versionId: version.id,
  });
};

const toCommitPlace = async (
  deps: DirectEditDeps,
  scope: PlaceScope,
  plan: PlacePlan
): Promise<Version> => {
  const { direction, project } = scope;
  const title = `Photo: ${plan.image.title}`;
  const files = toPlaceFiles(plan);

  const meta: VersionMeta = {
    kind: "manual",
    prompt: `${title} at ${files.join(", ")}`,
  };

  await savesSettled(project.id);
  await toWritePlacePlan(plan);

  const version = saveDeferred(deps, project, direction, files, title, meta);

  toRecordHistory(deps, scope, plan, version);
  await publishVersion(deps, project, direction, version);

  return version;
};

const toPlaceImage = async (
  deps: DirectEditDeps,
  scope: PlaceScope,
  input: PlaceImageInput,
  target: PlaceTarget
): Promise<PlaceImageDone> => {
  assertCanEdit(deps, scope.project, scope.direction);

  const plan = await toPlanPlaceImage(scope, input, target);

  if (!isPlaceChanged(plan)) {
    return { result: toPlaceResult(plan, null), version: null };
  }

  const version = await toCommitPlace(deps, scope, plan);

  return { result: toPlaceResult(plan, version), version };
};

const isPlaceError = (error: Error | null): boolean =>
  error instanceof ImageSearchError || error instanceof DirectEditError;

export {
  isPlaceChanged,
  isPlaceError,
  toPlaceFiles as placeFiles,
  toPlaceImage as placeImage,
  toPlanPlaceImage as planPlaceImage,
  toPlaceResult,
  toWritePlacePlan as writePlacePlan,
};

export type { PlacePlan, PlaceScope };

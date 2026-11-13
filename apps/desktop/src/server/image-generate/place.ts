import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  assertCanEdit,
  IMAGE_ALT_MAX,
  parseSetImage,
  planAsset,
  planChanged,
  planSetImage,
  publishVersion,
  runFileLockGuard,
  saveDeferred,
  savesSettled,
  writeImagePlan,
} from "./deps.js";
import type {
  DirectEditDeps,
  Direction,
  ImageBytes,
  Project,
  VersionMeta,
} from "./deps.js";

interface PlaceResult {
  readonly asset: string;
  readonly src: string | null;
  readonly versionId: string | null;
}

interface PlaceCommand {
  readonly alt: string | null;
  readonly layer: unknown;
  readonly prompt: string;
  readonly title: string;
}

interface SetImageBody {
  readonly alt?: string;
  readonly target: unknown;
}

interface PlaceScope {
  readonly direction: Direction;
  readonly previewOrigin: string | null;
  readonly project: Project;
  readonly workTree: string;
}

const GENERATE_TITLE = "Generate image";

const altOf = (prompt: string): string => prompt.trim().slice(0, IMAGE_ALT_MAX);

const writeOnce = async (file: string, bytes: Buffer): Promise<void> => {
  try {
    await writeFile(file, bytes, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
};

const saveOnly = async (
  deps: DirectEditDeps,
  scope: PlaceScope,
  image: ImageBytes
): Promise<PlaceResult> => {
  const { direction, project } = scope;
  const asset = await planAsset(project, scope.workTree, null, image);

  if (asset.exists) {
    return { asset: asset.relative, src: asset.src, versionId: null };
  }

  assertCanEdit(deps, project, direction);
  await savesSettled(project.id);
  await mkdir(path.dirname(asset.file), { recursive: true });
  await writeOnce(asset.file, asset.bytes);

  const meta: VersionMeta = {
    kind: "manual",
    prompt: `${GENERATE_TITLE}: saved ${asset.relative}`,
  };

  const version = saveDeferred(
    deps,
    project,
    direction,
    [asset.relative],
    GENERATE_TITLE,
    meta
  );

  await publishVersion(deps, project, direction, version);

  return { asset: asset.relative, src: asset.src, versionId: version.id };
};

const toRequestOf = (command: PlaceCommand): SetImageBody => {
  if (command.alt === null) {
    return { target: command.layer };
  }

  return { alt: command.alt, target: command.layer };
};

const commitPlan = async (
  deps: DirectEditDeps,
  scope: PlaceScope,
  command: PlaceCommand,
  image: ImageBytes
): Promise<PlaceResult> => {
  const { direction, project } = scope;
  const request = parseSetImage(toRequestOf(command));

  assertCanEdit(deps, project, direction);

  const plan = await planSetImage(scope, request, image);
  const asset = plan.asset?.relative ?? "";
  const src = plan.asset?.src ?? null;

  if (!planChanged(plan)) {
    return { asset, src, versionId: null };
  }

  await runFileLockGuard(project.id, direction.id, [plan.target.relative]);
  await savesSettled(project.id);
  await writeImagePlan(plan);

  const files = [plan.target.relative];

  if (asset !== "") {
    files.push(asset);
  }

  const meta: VersionMeta = {
    kind: "manual",
    prompt: `${command.title}: ${command.prompt} at ${files.join(", ")}`,
  };

  const version = saveDeferred(
    deps,
    project,
    direction,
    files,
    command.title,
    meta
  );

  deps.history?.record({
    directionId: direction.id,
    files: [
      {
        after: plan.code,
        before: plan.original,
        file: plan.target.file,
        relative: plan.target.relative,
      },
    ],
    label: command.title,
    projectId: project.id,
    versionId: version.id,
  });
  await publishVersion(deps, project, direction, version);

  return { asset, src, versionId: version.id };
};

const placeGenerated = (
  deps: DirectEditDeps,
  scope: PlaceScope,
  command: PlaceCommand | null,
  image: ImageBytes
): Promise<PlaceResult> => {
  if (command === null) {
    return saveOnly(deps, scope, image);
  }

  return commitPlan(deps, scope, command, image);
};

export { altOf, GENERATE_TITLE, placeGenerated };

export type { PlaceCommand, PlaceResult, PlaceScope };

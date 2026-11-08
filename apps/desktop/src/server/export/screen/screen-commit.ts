import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";
import { CANVAS_FILE } from "@design-studio/contracts/canvas-file";
import type {
  CanvasFile,
  CanvasFileFrame,
} from "@design-studio/contracts/canvas-file";

import type { PlannedFile, ScreenWritePlan } from "../../app/index.js";
import {
  applyPlacement,
  CANVAS_VIEWPORTS,
  canvasPath,
} from "../../canvas/index.js";
import type { PlaceSpec } from "../../canvas/index.js";
import {
  assertCanEdit,
  publishVersion,
  writeNewFile,
} from "../../direct-edit/index.js";
import type { DirectionRun } from "../../direct-edit/index.js";
import { ConflictError } from "../../platform/errors/index.js";

const CLIENT = "ui";

interface RecordedFile {
  readonly after: string;
  readonly before: string;
  readonly created: boolean;
  readonly file: string;
  readonly relative: string;
}

interface VersionChange {
  readonly paths: readonly string[];
  readonly records: readonly RecordedFile[];
}

interface PlacedFrame {
  readonly after: string | null;
  readonly before: string | null;
  readonly frameId: string;
}

interface CommittedScreen {
  readonly frameId: string;
  readonly versionId: string | null;
}

const hasFile = async (file: string): Promise<boolean> => {
  try {
    await stat(file);

    return true;
  } catch {
    return false;
  }
};

const getCanvasText = async (
  project: Project,
  direction: Direction
): Promise<string | null> => {
  if (project.app) {
    return null;
  }

  try {
    return await readFile(canvasPath(direction.workTree), "utf-8");
  } catch {
    return null;
  }
};

const toFileWithEntry = (file: CanvasFile, directionId: string): CanvasFile => {
  if (file.frames.length > 0) {
    return file;
  }

  return applyPlacement(file, [{ ...CANVAS_VIEWPORTS.desktop }], directionId)
    .file;
};

const toTrimmedPath = (value: string | undefined): string =>
  (value ?? "")
    .split("/")
    .filter((part) => part !== "")
    .join("/");

const toSourceFrame = (
  file: CanvasFile,
  rightOfPath: string | null
): CanvasFileFrame | null => {
  if (rightOfPath === null) {
    return null;
  }

  return (
    file.frames.find((frame) => toTrimmedPath(frame.path) === rightOfPath) ??
    null
  );
};

const toPlaceSpec = (
  plan: ScreenWritePlan,
  source: CanvasFileFrame | null
): PlaceSpec => {
  const base = { label: plan.label, path: plan.framePath };

  if (source !== null) {
    return { ...base, rightOf: source.id };
  }

  return { ...base, ...CANVAS_VIEWPORTS.desktop };
};

const createScreenFrame = async (
  run: DirectionRun,
  plan: ScreenWritePlan
): Promise<PlacedFrame> => {
  const { direction, project, runtime } = run;
  const before = await getCanvasText(project, direction);
  let frameId = "";

  await runtime.canvas.update(
    project,
    (file) => {
      const seeded = toFileWithEntry(file, direction.id);
      const source = toSourceFrame(seeded, plan.rightOfPath);
      const spec = toPlaceSpec(plan, source);
      const next = applyPlacement(seeded, [spec], direction.id);

      frameId = next.placed.at(0)?.id ?? "";

      return next.file;
    },
    { source: "agent" }
  );

  const after = await getCanvasText(project, direction);

  return { after, before, frameId };
};

const toCanvasChange = (
  project: Project,
  direction: Direction,
  placed: Pick<PlacedFrame, "after" | "before">
): VersionChange => {
  if (project.app) {
    return { paths: [], records: [] };
  }

  const record: RecordedFile = {
    after: placed.after ?? "",
    before: placed.before ?? "",
    created: placed.before === null,
    file: canvasPath(direction.workTree),
    relative: CANVAS_FILE,
  };

  return { paths: [CANVAS_FILE], records: [record] };
};

const toFileChange = (
  workTree: string,
  files: readonly PlannedFile[]
): VersionChange => ({
  paths: files.map((item) => item.relative),
  records: files.map((item) => ({
    after: item.code,
    before: "",
    created: true,
    file: path.join(workTree, item.relative),
    relative: item.relative,
  })),
});

const createScreenVersion = async (
  run: DirectionRun,
  title: string,
  changes: readonly VersionChange[]
): Promise<string | null> => {
  const { direction, project, runtime } = run;
  const deps = runtime.editDeps;
  const paths = changes.flatMap((change) => change.paths);
  const records = changes.flatMap((change) => change.records);

  const version = await deps.versions.commitFile(
    project,
    direction,
    paths,
    title,
    { client: CLIENT, kind: "manual", prompt: `${title} by ${CLIENT}` }
  );

  if (version === null) {
    return null;
  }

  deps.history?.record({
    directionId: direction.id,
    files: records,
    label: title,
    projectId: project.id,
    versionId: version.id,
  });

  await publishVersion(deps, project, direction, version);

  return version.id;
};

const toRollbackPaths = (plan: ScreenWritePlan): readonly string[] => {
  if (plan.rollbackRoot !== null) {
    return [plan.rollbackRoot];
  }

  return plan.files.map((file) => file.relative);
};

const getTakenFile = async (
  workTree: string,
  plan: ScreenWritePlan
): Promise<string | null> => {
  const taken = await Promise.all(
    plan.files.map((file) => hasFile(path.join(workTree, file.relative)))
  );

  const clash = plan.files.find((_file, index) => taken[index] === true);

  return clash?.relative ?? null;
};

const createPlannedFiles = async (
  workTree: string,
  plan: ScreenWritePlan
): Promise<void> => {
  const clash = await getTakenFile(workTree, plan);

  if (clash !== null) {
    throw new ConflictError(`The file ${clash} exists already.`);
  }

  try {
    await Promise.all(
      plan.files.map((file) =>
        writeNewFile(path.join(workTree, file.relative), file.code)
      )
    );
  } catch (error) {
    await Promise.all(
      toRollbackPaths(plan).map((root) =>
        rm(path.join(workTree, root), { force: true, recursive: true })
      )
    );

    throw error;
  }
};

const createScreenFiles = async (
  run: DirectionRun,
  plan: ScreenWritePlan
): Promise<CommittedScreen> => {
  const { direction, project, runtime } = run;
  assertCanEdit(runtime.editDeps, project, direction);

  await createPlannedFiles(direction.workTree, plan);

  const placed = await createScreenFrame(run, plan);
  const { after, before, frameId } = placed;

  const versionId = await createScreenVersion(run, plan.versionTitle, [
    toFileChange(direction.workTree, plan.files),
    toCanvasChange(project, direction, { after, before }),
  ]);

  return { frameId, versionId };
};

export { createScreenFiles };

export type { CommittedScreen };

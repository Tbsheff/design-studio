import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";
import { CANVAS_FILE } from "@design-studio/contracts/canvas-file";
import type { CanvasFile } from "@design-studio/contracts/canvas-file";

import {
  applyPlacement,
  CANVAS_VIEWPORTS,
  canvasPath,
} from "../../canvas/index.js";
import {
  assertCanEdit,
  publishVersion,
  writeNewFile,
} from "../../direct-edit/index.js";
import type { DirectionRun } from "../../direct-edit/index.js";
import { insertExcludeEntry } from "./fixture-exclude.js";
import type {
  PlannedFile,
  CreateFixtureCommand,
  DeleteFixtureCommand,
  FixtureCreated,
  FixtureDeleted,
  StoredFixture,
} from "./fixture-model.js";
import { toFixturePlan } from "./fixture-plan.js";

const CLIENT = "ui";

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

interface PlacedFrame {
  readonly after: string | null;
  readonly before: string | null;
  readonly frameId: string;
}

const createFixtureFrame = async (
  run: DirectionRun,
  url: string,
  title: string
): Promise<PlacedFrame> => {
  const { direction, project, runtime } = run;
  const before = await getCanvasText(project, direction);
  let frameId = "";

  await runtime.canvas.update(
    project,
    (file) => {
      const next = applyPlacement(
        toFileWithEntry(file, direction.id),
        [
          {
            height: CANVAS_VIEWPORTS.desktop.height,
            label: title,
            path: url,
            width: CANVAS_VIEWPORTS.desktop.width,
          },
        ],
        direction.id
      );

      frameId = next.placed[0]?.id ?? "";

      return next.file;
    },
    { source: "agent" }
  );

  const after = await getCanvasText(project, direction);

  return { after, before, frameId };
};

const deleteFixtureFrame = async (
  run: DirectionRun,
  frameId: string
): Promise<void> => {
  await run.runtime.canvas.update(
    run.project,
    (file) => ({
      ...file,
      frames: file.frames.filter((frame) => frame.id !== frameId),
    }),
    { source: "agent" }
  );
};

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

const createFixtureVersion = async (
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

const createPlannedFiles = async (
  workTree: string,
  files: readonly { readonly code: string; readonly relative: string }[]
): Promise<void> => {
  await Promise.all(
    files.map((file) =>
      writeNewFile(path.join(workTree, file.relative), file.code)
    )
  );
};

const createFixturePage = async (
  run: DirectionRun,
  command: CreateFixtureCommand
): Promise<{
  readonly created: FixtureCreated;
  readonly stored: StoredFixture;
}> => {
  const { direction, project, runtime } = run;
  assertCanEdit(runtime.editDeps, project, direction);

  const plan = await toFixturePlan({ direction, project }, command);

  try {
    await createPlannedFiles(direction.workTree, plan.files);
  } catch (error) {
    await rm(path.join(direction.workTree, plan.folder), {
      force: true,
      recursive: true,
    });
    throw error;
  }

  await insertExcludeEntry(
    direction.workTree,
    `${path.posix.basename(path.posix.dirname(plan.folder))}/`
  );

  const placed = await createFixtureFrame(run, plan.url, plan.label);
  const { after, before, frameId } = placed;
  const page = plan.files.find((item) => item.relative.includes("page."));
  const file = page?.relative ?? plan.folder;

  const versionId = await createFixtureVersion(
    run,
    `Create data fixture ${plan.url}`,
    [
      toFileChange(direction.workTree, plan.files),
      toCanvasChange(project, direction, { after, before }),
    ]
  );

  const { removed, unresolved } = plan;
  const route = `/${plan.url}`;
  const fixtureId = plan.id;
  const id = fixtureId;

  const created: FixtureCreated = {
    file,
    fixtureId,
    frameId,
    removed,
    route,
    unresolved,
    versionId,
  };

  const createdAt = new Date().toISOString();
  const directionId = direction.id;
  const { folder } = plan;
  const { sourceRoute } = plan;

  const stored: StoredFixture = {
    createdAt,
    directionId,
    file,
    folder,
    frameId,
    id,
    route,
    sourceRoute,
  };

  return { created, stored };
};

const deleteFixturePage = async (
  run: DirectionRun,
  stored: StoredFixture,
  command: DeleteFixtureCommand
): Promise<FixtureDeleted> => {
  const { direction, project, runtime } = run;
  assertCanEdit(runtime.editDeps, project, direction);

  const before = await getCanvasText(project, direction);

  await rm(path.join(direction.workTree, stored.folder), {
    force: true,
    recursive: true,
  });

  await deleteFixtureFrame(run, stored.frameId);
  const after = await getCanvasText(project, direction);

  await createFixtureVersion(run, `Delete data fixture ${stored.route}`, [
    { paths: [stored.folder], records: [] },
    toCanvasChange(project, direction, { after, before }),
  ]);

  return {
    file: stored.file,
    fixtureId: command.fixtureId,
    frameId: stored.frameId,
  };
};

export { createFixturePage, deleteFixturePage };

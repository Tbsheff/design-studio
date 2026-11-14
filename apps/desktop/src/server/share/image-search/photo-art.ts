import { readdir } from "node:fs/promises";
import path from "node:path";

import type { ProjectStore } from "../../../shared/server-ports.js";
import {
  assertCanEdit,
  isOwnAgentRun,
  publishVersion,
  runFileLockGuard,
  saveDeferred,
  savesSettled,
  writeAtomic,
} from "./deps.js";
import type { AttrChanges, DirectEditDeps, Project, Version } from "./deps.js";
import { isImageSearchOn } from "./gate.js";
import {
  isArtPage,
  toPageSlots,
  toSlotAttrs,
  toSlotLabelFree,
} from "./photo-art-jsx.js";
import {
  toArtAssetFiles,
  toArtCode,
  toArtPlan,
  toReadText,
  toWriteArtAssets,
} from "./photo-art-plan.js";
import type { PhotoArtPlan } from "./photo-art-plan.js";
import type { PhotoFillScope, PhotoPage } from "./photo-pick.js";
import { PHOTO_ATTR } from "./photo-slots.js";
import type { PhotoSlot } from "./photo-slots.js";

interface SlotEdit {
  readonly changes: AttrChanges;
  readonly isLabelFree: boolean;
  readonly slot: PhotoSlot;
}

interface PageArt {
  readonly code: string;
  readonly count: number;
  readonly page: PhotoPage;
  readonly plan: PhotoArtPlan;
}

interface PhotoArtDone {
  readonly count: number;
  readonly versionId: string | null;
}

interface ArtFillDone {
  readonly note: string;
  readonly versionId: string | null;
}

interface RunArtIds {
  readonly directionId: string;
  readonly projectId: string;
}

const ART_TITLE = "Photo art";

const SOURCE_FOLDER = "src";

const isRunDraft = (scope: PhotoFillScope): boolean =>
  scope.direction.headVersionId === null &&
  isOwnAgentRun(scope.project.id, scope.direction.id);

const toReadNames = async (folder: string): Promise<readonly string[]> => {
  try {
    return await readdir(folder);
  } catch {
    return [];
  }
};

const toEditedSource = (
  page: PhotoPage,
  edits: readonly SlotEdit[]
): string => {
  const ordered = edits.toSorted(
    (left, right) =>
      right.slot.line - left.slot.line || right.slot.col - left.slot.col
  );

  let code = page.source;

  for (const edit of ordered) {
    const position = { col: edit.slot.col, line: edit.slot.line };

    if (edit.isLabelFree) {
      code = toSlotLabelFree(page.relative, code, position);
    }

    code = toSlotAttrs(page.relative, code, position, edit.changes);
  }

  return code;
};

const toArtEdits = (plan: PhotoArtPlan): readonly SlotEdit[] =>
  [...plan.changes].map(([slot, art]) => ({
    changes: art,
    isLabelFree: !slot.isImg && !plan.isRepaint,
    slot,
  }));

const toPlanArt = (page: PhotoPage, plan: PhotoArtPlan): PageArt => {
  const edits = toArtEdits(plan);

  if (edits.length === 0) {
    return { code: page.source, count: 0, page, plan };
  }

  const code = toArtCode(page, toEditedSource(page, edits), plan);
  const count = edits.length;

  return { code, count, page, plan };
};

const toPageArt = async (
  scope: PhotoFillScope,
  page: PhotoPage
): Promise<PageArt> =>
  toPlanArt(page, await toArtPlan(scope, page, toPageSlots(page)));

const toWritePageArt = async (arts: readonly PageArt[]): Promise<void> => {
  await Promise.all(arts.map((art) => toWriteArtAssets(art.plan)));
  await Promise.all(arts.map((art) => writeAtomic(art.page.file, art.code)));
};

const toRecordArt = (
  deps: DirectEditDeps,
  scope: PhotoFillScope,
  arts: readonly PageArt[],
  version: Version
): void => {
  deps.history?.record({
    directionId: scope.direction.id,
    files: arts.flatMap((art) => [
      {
        after: art.code,
        before: art.page.source,
        file: art.page.file,
        relative: art.page.relative,
      },
      ...toArtAssetFiles(art.plan),
    ]),
    label: version.title,
    projectId: scope.project.id,
    versionId: version.id,
  });
};

const applyPhotoArt = async (
  deps: DirectEditDeps,
  scope: PhotoFillScope,
  pages: readonly PhotoPage[]
): Promise<PhotoArtDone> => {
  const all = await Promise.all(pages.map((page) => toPageArt(scope, page)));
  const arts = all.filter((art) => art.count > 0);
  const count = arts.reduce((sum, art) => sum + art.count, 0);

  if (count === 0) {
    return { count: 0, versionId: null };
  }

  if (isRunDraft(scope)) {
    await toWritePageArt(arts);

    return { count, versionId: null };
  }

  assertCanEdit(deps, scope.project, scope.direction);

  const { direction, project } = scope;

  const files = arts.flatMap((art) => [
    art.page.relative,
    ...toArtAssetFiles(art.plan).map((asset) => asset.relative),
  ]);

  await runFileLockGuard(project.id, direction.id, files);
  await savesSettled(project.id);
  await toWritePageArt(arts);

  const version = saveDeferred(deps, project, direction, files, ART_TITLE, {
    kind: "manual",
    prompt: `${ART_TITLE}: ${count} slot(s) at ${files.join(", ")}`,
  });

  toRecordArt(deps, scope, arts, version);
  await publishVersion(deps, project, direction, version);

  return { count, versionId: version.id };
};

const toArtNote = (count: number, relative: string): string => {
  if (count === 0) {
    return `Image search is off. ${relative} has no plain ${PHOTO_ATTR} slot, so nothing changed.`;
  }

  if (count === 1) {
    return "Image search is off. The studio painted 1 art slot.";
  }

  return `Image search is off. The studio painted ${count} art slots.`;
};

const toArtFill = async (
  deps: DirectEditDeps,
  scope: PhotoFillScope,
  page: PhotoPage
): Promise<ArtFillDone> => {
  const done = await applyPhotoArt(deps, scope, [page]);

  return {
    note: toArtNote(done.count, page.relative),
    versionId: done.versionId,
  };
};

const toRunPages = async (
  workTree: string,
  project: Project
): Promise<readonly PhotoPage[]> => {
  const [names, sources] = await Promise.all([
    toReadNames(workTree),
    toReadNames(path.join(workTree, SOURCE_FOLDER)),
  ]);

  const nested = sources.map((name) => `${SOURCE_FOLDER}/${name}`);

  const relatives = [...new Set([project.entry, ...names, ...nested])].filter(
    (name) => isArtPage(project, name)
  );

  const pages = await Promise.all(
    relatives.map(async (relative) => {
      const file = path.join(workTree, relative);

      return { file, relative, source: await toReadText(file) };
    })
  );

  return pages.filter((page) => page.source.includes("data-photo"));
};

const applyRunPhotoArt = async (
  deps: DirectEditDeps,
  projects: Pick<ProjectStore, "get">,
  ids: RunArtIds
): Promise<PhotoArtDone> => {
  const project = await projects.get(ids.projectId);

  const direction =
    project.directions.find((candidate) => candidate.id === ids.directionId) ??
    null;

  if (
    direction === null ||
    direction.headVersionId === null ||
    isImageSearchOn(project)
  ) {
    return { count: 0, versionId: null };
  }

  const pages = await toRunPages(direction.workTree, project);
  const scope = { direction, project, workTree: direction.workTree };

  return await applyPhotoArt(deps, scope, pages);
};

export {
  applyPhotoArt,
  applyRunPhotoArt,
  isRunDraft,
  toArtFill,
  toEditedSource,
  toPlanArt,
  toRunPages,
  toWritePageArt,
};

export type { PageArt, PhotoArtDone, RunArtIds, SlotEdit };

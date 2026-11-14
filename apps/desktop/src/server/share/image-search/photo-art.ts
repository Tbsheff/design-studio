import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import type { ProjectStore } from "../../../shared/server-ports.js";
import {
  assertCanEdit,
  isOwnAgentRun,
  publishVersion,
  runFileLockGuard,
  saveDeferred,
  savesSettled,
  setHtmlAttrs,
  writeAtomic,
  writeNewFile,
} from "./deps.js";
import type { AttrChanges, DirectEditDeps, Version } from "./deps.js";
import { toArtHash, toPhotoArt } from "./engine/index.js";
import { isImageSearchOn } from "./gate.js";
import { toArtColors } from "./photo-art-colors.js";
import type { PhotoFillScope, PhotoPage } from "./photo-pick.js";
import { ART_ATTR, isHtmlPage, toPhotoSlots } from "./photo-slots.js";
import type { PhotoSlot } from "./photo-slots.js";
import { toLabelFree, toLabelText } from "./photo-tag.js";

interface PhotoArtAsset {
  readonly exists: boolean;
  readonly file: string;
  readonly relative: string;
  readonly svg: string;
}

interface PhotoArtPlan {
  readonly assets: readonly PhotoArtAsset[];
  readonly changes: ReadonlyMap<PhotoSlot, AttrChanges>;
}

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

interface ArtFileChange {
  readonly after: string;
  readonly before: string;
  readonly created: boolean;
  readonly file: string;
  readonly relative: string;
}

interface RunArtIds {
  readonly directionId: string;
  readonly projectId: string;
}

const ART_TITLE = "Photo art";

const ART_FOLDER = "assets";

const ART_BACKGROUND = "background-size: cover; background-position: center";

const ART_EXTRAS = new Set([
  "background-position: center",
  "background-size: cover",
]);

const SPACES = /\s+/gu;

const isArtImage = (part: string): boolean =>
  part.startsWith("background-image:") && part.includes("photo-art-");

const toArtFreeStyle = (style: string | null): string => {
  const own = (style ?? "").trim();

  if (!own.includes("photo-art-")) {
    return own;
  }

  return own
    .split(";")
    .map((part) => part.replaceAll(SPACES, " ").trim())
    .filter((part) => part !== "" && !isArtImage(part) && !ART_EXTRAS.has(part))
    .join("; ");
};

const isPlainSlot = (slot: PhotoSlot): boolean =>
  !slot.hasArt && !slot.hasImage;

const isRunDraft = (scope: PhotoFillScope): boolean =>
  scope.direction.headVersionId === null &&
  isOwnAgentRun(scope.project.id, scope.direction.id);

const toReadText = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const toReadNames = async (folder: string): Promise<readonly string[]> => {
  try {
    return await readdir(folder);
  } catch {
    return [];
  }
};

const isFile = async (file: string): Promise<boolean> => {
  try {
    const info = await stat(file);

    return info.isFile();
  } catch {
    return false;
  }
};

const toArtStyle = (slot: PhotoSlot, src: string): string => {
  const own = toArtFreeStyle(slot.style);
  const added = `background-image: url(${src}); ${ART_BACKGROUND}`;

  if (own === "") {
    return added;
  }

  return `${own}; ${added}`;
};

const toArtChanges = (
  page: PhotoPage,
  slot: PhotoSlot,
  asset: { readonly hash: string; readonly src: string }
): AttrChanges => {
  if (slot.isImg) {
    return {
      [ART_ATTR]: asset.hash,
      alt: slot.alt ?? slot.query,
      src: asset.src,
    } satisfies AttrChanges;
  }

  const position = { col: slot.col, line: slot.line };

  return {
    [ART_ATTR]: asset.hash,
    "aria-label": toLabelText(page.source, position) ?? slot.query,
    role: "img",
    style: toArtStyle(slot, asset.src),
  } satisfies AttrChanges;
};

const toArtPlan = async (
  scope: PhotoFillScope,
  page: PhotoPage,
  slots: readonly PhotoSlot[]
): Promise<PhotoArtPlan> => {
  const open = slots.filter((slot) => isPlainSlot(slot));

  if (!isHtmlPage(page.relative) || open.length === 0) {
    return { assets: [], changes: new Map() };
  }

  const colors = await toArtColors(scope.workTree, page);
  const drafts = new Map<string, Omit<PhotoArtAsset, "exists">>();
  const changes = new Map<PhotoSlot, AttrChanges>();

  for (const slot of open) {
    const svg = toPhotoArt({
      colors,
      orientation: slot.orientation,
      words: slot.query,
    });

    const hash = toArtHash(svg);
    const relative = `${ART_FOLDER}/photo-art-${hash}.svg`;

    const src = path.posix.relative(
      path.posix.dirname(page.relative),
      relative
    );

    drafts.set(relative, {
      file: path.join(scope.workTree, relative),
      relative,
      svg,
    });
    changes.set(slot, toArtChanges(page, slot, { hash, src }));
  }

  const listed = [...drafts.values()];
  const found = await Promise.all(listed.map((draft) => isFile(draft.file)));

  const assets = listed.map((draft, index) => ({
    exists: found[index] ?? false,
    file: draft.file,
    relative: draft.relative,
    svg: draft.svg,
  }));

  return { assets, changes };
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
      code = toLabelFree(code, position);
    }

    code = setHtmlAttrs(code, position, edit.changes);
  }

  return code;
};

const toArtEdits = (plan: PhotoArtPlan): readonly SlotEdit[] =>
  [...plan.changes].map(([slot, art]) => ({
    changes: art,
    isLabelFree: !slot.isImg,
    slot,
  }));

const toArtAssetFiles = (plan: PhotoArtPlan): readonly ArtFileChange[] =>
  plan.assets.flatMap((asset) => {
    if (asset.exists) {
      return [];
    }

    return [
      {
        after: asset.svg,
        before: "",
        created: true,
        file: asset.file,
        relative: asset.relative,
      },
    ];
  });

const toWriteArtAssets = async (plan: PhotoArtPlan): Promise<void> => {
  const fresh = plan.assets.filter((asset) => !asset.exists);

  await Promise.all(
    fresh.map(async (asset) => {
      if (!(await isFile(asset.file))) {
        await writeNewFile(asset.file, asset.svg);
      }
    })
  );
};

const toPageArt = async (
  scope: PhotoFillScope,
  page: PhotoPage
): Promise<PageArt> => {
  const plan = await toArtPlan(scope, page, toPhotoSlots(page.source));
  const edits = toArtEdits(plan);

  if (edits.length === 0) {
    return { code: page.source, count: 0, page, plan };
  }

  return { code: toEditedSource(page, edits), count: edits.length, page, plan };
};

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

const toRunPages = async (
  workTree: string,
  entry: string
): Promise<readonly PhotoPage[]> => {
  const names = await toReadNames(workTree);

  const relatives = [...new Set([entry, ...names])].filter((name) =>
    isHtmlPage(name)
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

  const pages = await toRunPages(direction.workTree, project.entry);
  const scope = { direction, project, workTree: direction.workTree };

  return await applyPhotoArt(deps, scope, pages);
};

export {
  applyPhotoArt,
  applyRunPhotoArt,
  isRunDraft,
  toArtAssetFiles,
  toArtEdits,
  toArtFreeStyle,
  toArtPlan,
  toEditedSource,
  toWriteArtAssets,
};

export type { PhotoArtDone, PhotoArtPlan, RunArtIds, SlotEdit };

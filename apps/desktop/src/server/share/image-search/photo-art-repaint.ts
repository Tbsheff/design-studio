import type { VersionStore } from "../../../shared/server-ports.js";
import { logError } from "../../platform/logger/index.js";
import type { DirectEditDeps, Direction, Project } from "./deps.js";
import { toArtAssetFiles, toRepaintPlan } from "./photo-art-plan.js";
import type { ArtFileChange } from "./photo-art-plan.js";
import { toPlanArt, toRunPages, toWritePageArt } from "./photo-art.js";
import type { PageArt } from "./photo-art.js";

type CommitArgs = Parameters<VersionStore["commitFile"]>;

type EditRecorder = NonNullable<DirectEditDeps["history"]>;

type EditEntry = Parameters<EditRecorder["record"]>[0];

interface RepaintScope {
  readonly direction: Direction;
  readonly project: Project;
}

const isChanged = (art: PageArt): boolean =>
  art.code !== art.page.source ||
  art.plan.sheet !== null ||
  art.plan.assets.some((asset) => !asset.exists);

const toPaintedFiles = async (
  scope: RepaintScope
): Promise<readonly ArtFileChange[]> => {
  const { direction, project } = scope;
  const { workTree } = direction;
  const pages = await toRunPages(workTree, project);
  const fill = { direction, project, workTree };

  const arts = await Promise.all(
    pages.map(async (page) => toPlanArt(page, await toRepaintPlan(fill, page)))
  );

  const changed = arts.filter((art) => isChanged(art));

  await toWritePageArt(changed);

  const pageFiles = changed.flatMap((art): ArtFileChange[] => {
    if (art.code === art.page.source) {
      return [];
    }

    return [
      {
        after: art.code,
        before: art.page.source,
        created: false,
        file: art.page.file,
        relative: art.page.relative,
      },
    ];
  });

  const assetFiles = changed.flatMap((art) => toArtAssetFiles(art.plan));
  const files = [...pageFiles, ...assetFiles];

  return [...new Map(files.map((file) => [file.relative, file])).values()];
};

const toSafePaintedFiles = async (
  scope: RepaintScope
): Promise<readonly ArtFileChange[]> => {
  try {
    return await toPaintedFiles(scope);
  } catch (error) {
    logError("[image-search] photo art repaint failed", error);

    return [];
  }
};

const toPathList = (paths: CommitArgs[2]): readonly string[] => {
  if (Array.isArray(paths)) {
    return paths;
  }

  return [paths];
};

const toRepaintDeps = (
  deps: DirectEditDeps,
  scope: RepaintScope
): DirectEditDeps => {
  const painted: ArtFileChange[] = [];
  const { history, versions } = deps;

  const commitFile = async (
    ...args: CommitArgs
  ): ReturnType<VersionStore["commitFile"]> => {
    if (painted.length === 0) {
      painted.push(...(await toSafePaintedFiles(scope)));
    }

    const next: CommitArgs = [...args];

    next[2] = [...toPathList(args[2]), ...painted.map((file) => file.relative)];

    return await versions.commitFile(...next);
  };

  const record = (entry: EditEntry): void => {
    history?.record({ ...entry, files: [...entry.files, ...painted] });
  };

  const wrapped: VersionStore = Object.assign(Object.create(versions), {
    commitFile,
  });

  if (!history) {
    return { ...deps, versions: wrapped };
  }

  return { ...deps, history: { record }, versions: wrapped };
};

export { toRepaintDeps };

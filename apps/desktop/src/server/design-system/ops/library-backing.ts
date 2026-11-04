import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Attachment, Project } from "../../../shared/actions/_core/contracts.js";
import { logError } from "../../platform/logger/index.js";
import { COVERAGE_FILE, META_FILE } from "../extract/draft.js";
import type { Draft, DraftFile } from "../extract/draft.js";
import { KIT_PAGE_FILE, renderKitPage } from "../extract/kit-page.js";
import { libraryCoverage } from "../extract/map.js";
import type { LoadedPack } from "../packs.js";
import type { PackWriteRuntime } from "./library-core.js";

interface ImageInput {
  readonly bytes: Uint8Array;
  readonly mime: string;
  readonly name: string;
}

interface BackingPlan {
  readonly images: readonly ImageInput[];
  readonly pack: LoadedPack;
  readonly source: BackingSource;
}

interface BackingSource {
  readonly files: DraftFile[];
  readonly inputs: Draft["inputs"];
  readonly kitHtml: string;
  readonly name: string;
}

const writeDraftFile = async (
  workTree: string,
  file: DraftFile
): Promise<void> => {
  const target = path.join(workTree, file.path);

  if (!target.startsWith(workTree + path.sep)) {
    throw new Error(`draft file outside the work tree: ${file.path}`);
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, file.content);
};

const writeDraftFiles = async (
  workTree: string,
  files: DraftFile[]
): Promise<void> => {
  await Promise.all(files.map((file) => writeDraftFile(workTree, file)));
};

const toMetaFile = (
  source: BackingSource,
  pack: LoadedPack,
  attachments: Attachment[]
): DraftFile => {
  const meta = {
    attachments: attachments.map((item) => ({
      id: item.id,
      mime: item.mime,
      name: item.name,
    })),
    createdAt: new Date().toISOString(),
    files: [KIT_PAGE_FILE, ...source.files.map((file) => file.path)],
    inputs: source.inputs,
    kind: "design-system-draft",
    name: source.name,
    packId: pack.manifest.id,
    version: 1,
  };

  return { content: `${JSON.stringify(meta, null, 2)}\n`, path: META_FILE };
};

const toLibrarySource = (pack: LoadedPack): BackingSource => {
  const { name, mode, fonts } = pack.manifest;

  const coverage = {
    content: `${JSON.stringify(libraryCoverage(pack), null, 2)}\n`,
    path: COVERAGE_FILE,
  };

  return {
    files: [coverage],
    inputs: { library: pack.manifest.id },
    kitHtml: renderKitPage({
      googleFontsUrl: fonts.googleFontsUrl,
      mode,
      name,
    }),
    name,
  };
};

const fillBacking = async (
  runtime: PackWriteRuntime,
  created: Project,
  plan: BackingPlan
): Promise<Project> => {
  const { projects } = runtime;
  const { images, pack, source } = plan;

  await runtime.drafts.versions.ensureRepo(created);

  const attachments = await Promise.all(
    images.map((image) => projects.saveAttachment(created.id, image))
  );

  const { workTree } = projects.mainDirection(created);

  await writeDraftFiles(workTree, [
    { content: source.kitHtml, path: KIT_PAGE_FILE },
    ...source.files,
    toMetaFile(source, pack, attachments),
  ]);

  return runtime.drafts.finishCreate(created, pack);
};

const discardCreated = async (
  runtime: PackWriteRuntime,
  projectId: string
): Promise<void> => {
  try {
    await runtime.projects.discardCreated(projectId);
  } catch (error) {
    logError(
      "[design-systems] could not remove the half-made backing project",
      error
    );
  }
};

const createBacking = async (
  runtime: PackWriteRuntime,
  source: BackingSource,
  pack: LoadedPack,
  images: readonly ImageInput[]
): Promise<Project> => {
  const { projects } = runtime;

  const created = await projects.createInFolder({
    designSystemFor: pack.manifest.id,
    kind: "html",
    name: `${source.name} design system`,
    parentPath: await runtime.drafts.projectsFolder(),
  });

  let project: Project | null = null;

  try {
    project = await fillBacking(runtime, created, { images, pack, source });
  } catch (error) {
    await discardCreated(runtime, created.id);
    throw error;
  }

  runtime.drafts.watch(project, projects.mainDirection(project));

  return project;
};

const deleteDraftPack = async (
  runtime: PackWriteRuntime,
  packId: string
): Promise<void> => {
  try {
    await runtime.library.deletePack(packId);
  } catch (error) {
    logError("[design-systems] could not remove the draft pack", error);
  }
};

const createPackBacking = async (
  runtime: PackWriteRuntime,
  source: BackingSource,
  pack: LoadedPack,
  images: readonly ImageInput[]
): Promise<Project> => {
  try {
    return await createBacking(runtime, source, pack, images);
  } catch (error) {
    await deleteDraftPack(runtime, pack.manifest.id);
    throw error;
  }
};

export { createBacking, createPackBacking, toLibrarySource };

export type { BackingSource, ImageInput };

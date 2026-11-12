import { stat } from "node:fs/promises";
import path from "node:path";

import type { Project } from "@design-studio/contracts";

import { writeAtomic } from "../platform/atomic-write/index.js";
import { toStarterPage } from "./engine/to-starter-page.js";
import { applyPack } from "./packs.js";
import type { LoadedPack } from "./packs.js";

const STARTER_PAGE_FILE = "index.html";

const isFile = async (file: string): Promise<boolean> => {
  try {
    const info = await stat(file);

    return info.isFile();
  } catch {
    return false;
  }
};

const isStarterPageWanted = (project: Project): boolean =>
  project.kind === "html" &&
  !project.designSystemFor &&
  (!project.imported || project.imported.created === true);

const applyCreatedPack = async (
  project: Project,
  workTree: string,
  pack: LoadedPack,
  designMd: string | undefined
): Promise<readonly string[]> => {
  const written = await applyPack(project, workTree, pack, {
    userDesignMd: designMd,
  });

  const page = path.join(workTree, STARTER_PAGE_FILE);

  if (!isStarterPageWanted(project) || (await isFile(page))) {
    return written;
  }

  await writeAtomic(
    page,
    toStarterPage({
      googleFontsUrl: pack.manifest.fonts.googleFontsUrl ?? null,
      packName: pack.manifest.name,
      title: project.name,
    }),
    { createDir: true }
  );

  return [...written, STARTER_PAGE_FILE];
};

export { applyCreatedPack };

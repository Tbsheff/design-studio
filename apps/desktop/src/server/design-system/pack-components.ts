import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import { DESIGN_SYSTEM_DIR } from "@design-studio/contracts";
import type { CreateUserPackInput } from "@design-studio/contracts";

import {
  extractRulesBlock,
  upsertRulesBlock,
} from "../design-rules/markdown.js";
import { writeAtomic } from "../platform/atomic-write/index.js";
import { toDesignMdWithComponents } from "./engine/to-components-md.js";
import { getComponentsMd } from "./extract/ui-components.js";
import type { PackLibrary } from "./library.js";
import type { LoadedPack } from "./packs.js";

interface DraftPackStart {
  readonly packId: string;
  readonly request: { readonly folderPath?: string | undefined };
}

const COMPONENTS_MD_FILE = "components.md";
const PROJECT_COMPONENTS_FILE = `${DESIGN_SYSTEM_DIR}/${COMPONENTS_MD_FILE}`;

const getOptionalText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const setPackComponents = async (
  packDir: string,
  text: string | null
): Promise<void> => {
  const file = path.join(packDir, COMPONENTS_MD_FILE);

  if (text === null) {
    await rm(file, { force: true });

    return;
  }

  await writeAtomic(file, text, { createDir: true });
};

const duplicatePackComponents = async (
  fromDir: string,
  toDir: string
): Promise<void> => {
  const text = await getOptionalText(path.join(fromDir, COMPONENTS_MD_FILE));

  if (text !== null) {
    await setPackComponents(toDir, text);
  }
};

const applyPackComponents = async (
  packDir: string,
  workTree: string
): Promise<readonly string[]> => {
  const text = await getOptionalText(path.join(packDir, COMPONENTS_MD_FILE));
  const target = path.join(workTree, PROJECT_COMPONENTS_FILE);

  if (text === null) {
    await rm(target, { force: true });

    return [];
  }

  await writeAtomic(target, text, { createDir: true });

  return [PROJECT_COMPONENTS_FILE];
};

const toKeptDesignMd = async (
  file: string,
  composed: string,
  componentFiles: readonly string[]
): Promise<string> => {
  const next = toDesignMdWithComponents(composed, componentFiles.length > 0);
  const current = await getOptionalText(file);
  const rules = extractRulesBlock(current ?? "");

  if (rules === null || extractRulesBlock(next) !== null) {
    return next;
  }

  return upsertRulesBlock(next, rules);
};

const updateDraftPack = async (
  library: PackLibrary,
  start: DraftPackStart,
  draft: { readonly pack: CreateUserPackInput },
  isDone: boolean
): Promise<LoadedPack> => {
  const pack = await library.updateUserPack(start.packId, {
    ...draft.pack,
    draft: true,
  });

  const folderPath = start.request.folderPath?.trim() ?? "";

  if (isDone && folderPath !== "") {
    await setPackComponents(pack.dir, await getComponentsMd(folderPath));
  }

  return pack;
};

export {
  applyPackComponents,
  duplicatePackComponents,
  toKeptDesignMd,
  updateDraftPack,
};

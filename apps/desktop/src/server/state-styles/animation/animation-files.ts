import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { AnimationSchema } from "@design-studio/actions/animation/schema";
import { Result, Schema } from "effect";

import { toDecoder } from "./deps.js";
import type { AnimationModel } from "./engine/index.js";

const toModel = toDecoder(Schema.fromJsonString(AnimationSchema), "ignore");

const ANIMATIONS_DIR = "studio/animations";

const CSS_CANDIDATES = [
  "src/index.css",
  "src/app/globals.css",
  "app/globals.css",
  "src/globals.css",
  "src/styles/globals.css",
  "styles/globals.css",
  "src/App.css",
  "src/app.css",
  "src/main.css",
  "src/styles.css",
  "src/style.css",
  "src/tailwind.css",
  "app/tailwind.css",
  "index.css",
  "styles.css",
  "style.css",
];

const toModelRelative = (id: string): string => `${ANIMATIONS_DIR}/${id}.json`;

const toModelText = (model: AnimationModel): string =>
  `${JSON.stringify(model, null, 2)}\n`;

const getTextOrNull = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const getModel = async (
  workTree: string,
  id: string
): Promise<AnimationModel | null> => {
  const text = await getTextOrNull(path.join(workTree, toModelRelative(id)));

  if (text === null) {
    return null;
  }

  const parsed = toModel(text);

  if (Result.isFailure(parsed)) {
    return null;
  }

  return parsed.success;
};

const toModelIds = (name: string): string[] => {
  if (name.endsWith(".json")) {
    return [name.slice(0, -".json".length)];
  }

  return [];
};

const listModelIds = async (workTree: string): Promise<string[]> => {
  try {
    const names = await readdir(path.join(workTree, ANIMATIONS_DIR));

    return names.flatMap((name) => toModelIds(name)).toSorted();
  } catch {
    return [];
  }
};

const listModels = async (workTree: string): Promise<AnimationModel[]> => {
  const ids = await listModelIds(workTree);
  const models = await Promise.all(ids.map((id) => getModel(workTree, id)));

  return models.filter((model) => model !== null);
};

const getCssEntry = async (workTree: string): Promise<string | null> => {
  const found = await Promise.all(
    CSS_CANDIDATES.map(async (relative) => {
      const text = await getTextOrNull(path.join(workTree, relative));

      return { relative, text };
    })
  );

  return found.find((entry) => entry.text !== null)?.relative ?? null;
};

export {
  ANIMATIONS_DIR,
  getCssEntry,
  getModel,
  getTextOrNull,
  listModelIds,
  listModels,
  toModelRelative,
  toModelText,
};

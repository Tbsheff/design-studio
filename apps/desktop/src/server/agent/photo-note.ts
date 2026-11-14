import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ResolvedRunConfig } from "../../shared/run-levels.js";
import { isLeanRun } from "./lean-run.js";
import type { DriverInput } from "./lifecycle.js";
import { isArtProject, isPhotoSearchOn } from "./photo-search.js";

const PHOTO_ART_NOTE =
  "Photo slots show art from your colors. Turn on image search for real photos (image sheet, or STUDIO_IMAGE_SEARCH=on).";

const PHOTO_NOTE =
  "Photo slots are gray boxes. Turn on image search in the image sheet (Turn on image search for this project) or with STUDIO_IMAGE_SEARCH=on for real photos.";

const PHOTO_NOTE_FILE = "photo-note.json";

const PHOTO_SLOT = "data-photo=";

const PAGE_FILE = /\.(?:html?|[jt]sx)$/iu;

const NOTE_LEVELS = new Set(["polish", "prototype"]);

const SOURCE_FOLDER = "src";

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

const toWriteMarker = async (file: string): Promise<void> => {
  try {
    await writeFile(file, JSON.stringify({ shownAt: Date.now() }));
  } catch {
    await Promise.resolve();
  }
};

const toPageFiles = async (
  workTree: string,
  entry: string
): Promise<readonly string[]> => {
  const [names, nested] = await Promise.all([
    toReadNames(workTree),
    toReadNames(path.join(workTree, SOURCE_FOLDER)),
  ]);

  const pages = [
    ...names,
    ...nested.map((name) => `${SOURCE_FOLDER}/${name}`),
  ].filter((name) => PAGE_FILE.test(name));

  return [...new Set([entry, ...pages])].map((name) =>
    path.join(workTree, name)
  );
};

const hasPhotoSlots = async (input: DriverInput): Promise<boolean> => {
  const { direction, project } = input.ctx;
  const files = await toPageFiles(direction.workTree, project.entry);
  const texts = await Promise.all(files.map((file) => toReadText(file)));

  return texts.some((text) => text.includes(PHOTO_SLOT));
};

const isEditRun = (input: DriverInput): boolean =>
  input.ctx.request.mode === "edit" && !isLeanRun(input.ctx.request);

const isPhotoNoteRun = (
  input: DriverInput,
  config: ResolvedRunConfig
): boolean =>
  isEditRun(input) &&
  NOTE_LEVELS.has(config.level) &&
  !isPhotoSearchOn(input.ctx.project);

const toPhotoNotes = async (
  input: DriverInput,
  config: ResolvedRunConfig
): Promise<readonly string[]> => {
  if (!isPhotoNoteRun(input, config) || !(await hasPhotoSlots(input))) {
    return [];
  }

  const marker = path.join(path.dirname(input.runsDir), PHOTO_NOTE_FILE);

  if ((await toReadText(marker)) !== "") {
    return [];
  }

  await toWriteMarker(marker);

  if (isArtProject(input.ctx.project)) {
    return [PHOTO_ART_NOTE];
  }

  return [PHOTO_NOTE];
};

export { toPhotoNotes };

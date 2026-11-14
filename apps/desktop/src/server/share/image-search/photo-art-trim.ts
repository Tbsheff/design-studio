import { readdir } from "node:fs/promises";
import path from "node:path";

import { SHEET_NAME } from "./photo-art-colors.js";
import { isJsxPage } from "./photo-art-jsx.js";
import { isFile, toReadText } from "./photo-art-plan.js";
import type { ArtFileChange, PhotoArtPlan } from "./photo-art-plan.js";
import type { PhotoPage } from "./photo-pick.js";

const SHEET_TAG = "style";

const SHEET_OPEN = ["<", SHEET_TAG, " data-photo-art-sheet>"].join("");

const SHEET_CLOSE = ["</", SHEET_TAG, ">"].join("");

const SLOT_KEY = /\sdata-photo-art=(?:"(?<double>[^"]+)"|'(?<single>[^']+)')/gu;

const RULE_KEY = /\[data-photo-art="(?<key>[^"]+)"\]/gu;

const CODE_PAGE = /\.[jt]sx?$/iu;

const toSlotKeys = (code: string): ReadonlySet<string> =>
  new Set(
    [...code.matchAll(SLOT_KEY)].map(
      (match) => match.groups?.double ?? match.groups?.single ?? ""
    )
  );

const toRuleKeys = (line: string): readonly string[] =>
  [...line.matchAll(RULE_KEY)].map((match) => match.groups?.key ?? "");

const toTrimmedLines = (
  text: string,
  isDead: (key: string) => boolean
): string =>
  text
    .split("\n")
    .filter((line) => !toRuleKeys(line).some((key) => isDead(key)))
    .join("\n");

const toTrimmedHtml = (code: string): string => {
  const open = code.indexOf(SHEET_OPEN);

  if (open === -1) {
    return code;
  }

  const start = open + SHEET_OPEN.length;
  const end = code.indexOf(SHEET_CLOSE, start);

  if (end === -1) {
    return code;
  }

  const outside = `${code.slice(0, open)}${code.slice(end)}`;
  const live = toSlotKeys(outside);
  const sheet = code.slice(start, end);
  const kept = toTrimmedLines(sheet, (key) => !live.has(key));

  if (kept === sheet) {
    return code;
  }

  if (kept.trim() === "") {
    const after = code.slice(end + SHEET_CLOSE.length).replace(/^\n/u, "");

    return `${code.slice(0, open)}${after}`;
  }

  return `${code.slice(0, start)}${kept}${code.slice(end)}`;
};

const toFolderNames = async (folder: string): Promise<readonly string[]> => {
  try {
    return await readdir(folder);
  } catch {
    return [];
  }
};

const toSiblingKeys = async (page: PhotoPage): Promise<ReadonlySet<string>> => {
  const folder = path.dirname(page.file);
  const own = path.basename(page.file);
  const files: string[] = [];

  for (const name of await toFolderNames(folder)) {
    if (name !== own && CODE_PAGE.test(name)) {
      files.push(path.join(folder, name));
    }
  }

  const texts = await Promise.all(files.map((file) => toReadText(file)));
  const keys = new Set<string>();

  for (const text of texts) {
    for (const key of toSlotKeys(text)) {
      keys.add(key);
    }
  }

  return keys;
};

const toSheetBase = async (
  page: PhotoPage,
  planned: ArtFileChange | null
): Promise<ArtFileChange | null> => {
  if (planned !== null) {
    return planned;
  }

  const file = path.join(path.dirname(page.file), SHEET_NAME);

  if (!(await isFile(file))) {
    return null;
  }

  const text = await toReadText(file);

  const relative = path.posix.join(
    path.posix.dirname(page.relative),
    SHEET_NAME
  );

  return { after: text, before: text, created: false, file, relative };
};

const toTrimmedSheet = async (
  page: PhotoPage,
  code: string,
  planned: ArtFileChange | null
): Promise<ArtFileChange | null> => {
  const left = toSlotKeys(code);
  const gone = [...toSlotKeys(page.source)].filter((key) => !left.has(key));

  if (gone.length === 0) {
    return planned;
  }

  const base = await toSheetBase(page, planned);

  if (base === null) {
    return planned;
  }

  const others = await toSiblingKeys(page);
  const dead = new Set(gone.filter((key) => !others.has(key)));
  const after = toTrimmedLines(base.after, (key) => dead.has(key));

  if (after === base.before) {
    return null;
  }

  return { ...base, after };
};

const toTrimmedArt = async (
  page: PhotoPage,
  code: string,
  art: PhotoArtPlan
): Promise<PhotoArtPlan> => {
  if (!isJsxPage(page.relative)) {
    return art;
  }

  return { ...art, sheet: await toTrimmedSheet(page, code, art.sheet) };
};

export { toTrimmedArt, toTrimmedHtml };

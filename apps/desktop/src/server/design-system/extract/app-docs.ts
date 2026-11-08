import { readFile } from "node:fs/promises";

import { safeFileInside } from "../app-tokens/detect.js";
import { harvestDesignText } from "./design-md.js";
import type { Harvest, SourceReport } from "./types.js";

const MAX_DOC_CHARS = 60_000;
const MAX_NOTES_CHARS = 8000;
const DESIGN_MD_FILES = ["DESIGN.md", "design.md", "docs/DESIGN.md"];
const NOTE_FILES = ["AGENTS.md", "CLAUDE.md"];

const NOTE_WORDS = new Set([
  "brand",
  "color",
  "colors",
  "colour",
  "colours",
  "copy",
  "density",
  "design",
  "font",
  "fonts",
  "layout",
  "palette",
  "spacing",
  "style",
  "styling",
  "theme",
  "tone",
  "typeface",
  "typography",
  "ui",
  "ux",
  "visual",
  "voice",
  "writing",
]);

const WORD_SPLIT = /[^a-z]+/u;
const HEADING_LINE = /^(?<marks>#{1,6})[ \t](?<title>.*)$/u;
const FENCE_LINE = /^\s*(?:```|~~~)/u;
const MD_SUFFIX = /\.md$/u;

interface AppDocFile {
  readonly file: string;
  readonly text: string;
}

interface AppDocs {
  readonly designMd: AppDocFile | null;
  readonly notes: readonly AppDocFile[];
}

interface DocHarvests {
  readonly harvests: Harvest[];
  readonly reports: SourceReport[];
}

interface DocSourceFile {
  readonly content: string;
  readonly path: string;
}

interface Scanned {
  readonly folder: { readonly docs: AppDocs } | null;
  readonly harvests: Harvest[];
  readonly reports: SourceReport[];
}

const getDocFile = async (
  root: string,
  relative: string
): Promise<AppDocFile | null> => {
  const full = await safeFileInside(root, relative);

  if (!full) {
    return null;
  }

  let text = "";

  try {
    text = await readFile(full, "utf-8");
  } catch {
    return null;
  }

  if (text.trim() === "") {
    return null;
  }

  return { file: relative, text: text.slice(0, MAX_DOC_CHARS) };
};

const getFirstDoc = async (
  root: string,
  names: readonly string[]
): Promise<AppDocFile | null> => {
  const docs = await Promise.all(names.map((name) => getDocFile(root, name)));

  return docs.find((doc): doc is AppDocFile => doc !== null) ?? null;
};

const isNoteHeading = (title: string): boolean =>
  title
    .toLowerCase()
    .split(WORD_SPLIT)
    .some((word) => NOTE_WORDS.has(word));

const toDesignNotes = (markdown: string): string | null => {
  const picked: string[] = [];
  let level = 0;
  let isPicking = false;
  let isFenced = false;

  for (const line of markdown.replaceAll("\r\n", "\n").split("\n")) {
    if (FENCE_LINE.test(line)) {
      isFenced = !isFenced;
    }

    const heading = HEADING_LINE.exec(line);

    if (heading?.groups && !isFenced) {
      const depth = heading.groups.marks?.length ?? 0;

      if (isPicking && depth <= level) {
        isPicking = false;
      }

      if (!isPicking && isNoteHeading(heading.groups.title ?? "")) {
        isPicking = true;
        level = depth;
      }
    }

    if (isPicking) {
      picked.push(line);
    }
  }

  const text = picked.join("\n").trim();

  if (text === "") {
    return null;
  }

  return text.slice(0, MAX_NOTES_CHARS);
};

const getAppDocs = async (root: string): Promise<AppDocs> => {
  const [designMd, ...found] = await Promise.all([
    getFirstDoc(root, DESIGN_MD_FILES),
    ...NOTE_FILES.map((name) => getDocFile(root, name)),
  ]);

  const notes: AppDocFile[] = [];

  for (const doc of found) {
    if (doc) {
      const text = toDesignNotes(doc.text);

      if (text) {
        notes.push({ file: doc.file, text });
      }
    }
  }

  return { designMd: designMd ?? null, notes };
};

const toDocHarvests = (docs: AppDocs | null): DocHarvests => {
  const harvests: Harvest[] = [];
  const reports: SourceReport[] = [];

  if (!docs) {
    return { harvests, reports };
  }

  if (docs.designMd) {
    const label = `${docs.designMd.file} in the app`;
    const harvest = harvestDesignText(docs.designMd.text, "design-md", label);
    const found = harvest.candidates.length;
    const kind = "design-md";
    const ok = true;
    harvests.push(harvest);
    reports.push({ found, kind, label, ok });
  }

  for (const doc of docs.notes) {
    const label = `${doc.file} in the app`;
    const harvest = harvestDesignText(doc.text, "brief", label);
    const found = harvest.candidates.length;
    const kind = "brief";
    const ok = true;
    harvests.push(harvest);
    reports.push({ found, kind, label, ok });
  }

  return { harvests, reports };
};

const toDocFiles = (docs: AppDocs | null): DocSourceFile[] => {
  if (!docs) {
    return [];
  }

  const files: DocSourceFile[] = [];

  if (docs.designMd) {
    files.push({
      content: `${docs.designMd.text.trimEnd()}\n`,
      path: "source/app/DESIGN.md",
    });
  }

  for (const doc of docs.notes) {
    files.push({
      content: `${doc.text.trimEnd()}\n`,
      path: `source/app/${doc.file.replace(MD_SUFFIX, "")}.design-notes.md`,
    });
  }

  return files;
};

const toHarvestedWithDocs = <Harvested extends Scanned>(
  harvested: Harvested
): Harvested => {
  const extra = toDocHarvests(harvested.folder?.docs ?? null);

  return {
    ...harvested,
    harvests: [...harvested.harvests, ...extra.harvests],
    reports: [...harvested.reports, ...extra.reports],
  };
};

const toAppDesignMd = (
  pasted: string | undefined,
  docs: AppDocs | null
): string | null => {
  if (pasted?.trim()) {
    return pasted;
  }

  return docs?.designMd?.text ?? null;
};

const toAppNotesText = (docs: AppDocs | null): string | null => {
  if (!docs || docs.notes.length === 0) {
    return null;
  }

  return docs.notes.map((doc) => `${doc.file}:\n${doc.text}`).join("\n\n");
};

export {
  getAppDocs,
  toAppDesignMd,
  toAppNotesText,
  toDocFiles,
  toHarvestedWithDocs,
};

export type { AppDocFile, AppDocs };
